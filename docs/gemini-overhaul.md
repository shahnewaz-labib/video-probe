# Video Probe — Gemini Overhaul Spec

> **Status: implemented.** Kept as a design record. The corrections below are
> the parts of this spec that were wrong — the code is right, this document is
> only right once you've read this box.
>
> Verified against `@google/genai@2.13.0` type definitions rather than the
> published JS docs, which disagree with the shipped SDK on three points:
>
> | Spec said | Actually |
> |---|---|
> | `generation_config: { media_resolution }` | Media resolution is a **per-part** field: `VideoContent.resolution`. `GenerationConfig` has no such key. Values: `low` \| `medium` \| `high` \| `ultra_high`. |
> | Stream events discriminate on `type` | They discriminate on **`event_type`**. |
> | `step.delta` → `event.delta.text` | `delta` is itself a ~24-member union. Must check `delta.type === "text"` first, or thought-summary and tool-call deltas stream to the browser as if they were the answer. |
> | `files.upload` might reject a Blob; tmp-file fallback | Signature is `file: string \| Blob`. A Web `File` passes straight through; the fallback was never needed. |
>
> Also changed during implementation:
> - **Env validation is lazy** (getters), not eager. Eager reads at module scope
>   make `next build` require production secrets, because Next imports route
>   modules to analyse them. Same for the Gemini, Redis, and Ratelimit clients.
> - **`src/middleware.ts` → `src/proxy.ts`** — Next 16 renamed the convention.
> - **Package upgrades** were pulled in (Next 16, React 19, Clerk 7, Tailwind 4,
>   Prisma 7, TypeScript 7), which the original spec had listed as out of scope.
> - **Node pinned to 24** via `.node-version`. Prisma 7 and TypeScript 7 both
>   refuse to run on 20.9.
> - **Prisma 7 migration**: provider `prisma-client-js` → `prisma-client`,
>   generated to `src/generated/prisma` (gitignored) instead of `node_modules`,
>   `url` removed from `schema.prisma` entirely, connection string moved to
>   `prisma.config.ts` for the CLI and to a `@prisma/adapter-pg` driver adapter
>   for the client. The reported Turbopack SSR resolution bug did not reproduce.
> - **`experimental.useTypeScriptCli: true`** in `next.config.mjs` — TypeScript 7
>   dropped the compiler API Next's type-check worker calls, and Next errors out
>   pointing at this flag.
> - **`docker-compose.yml` pinned to `postgres:18`** with the mount moved to
>   `/var/lib/postgresql`; `postgres:latest` had rolled to 18 and would not start
>   against the old `/data` mount.
>
> **Verification results (run against a live key).** Passed: both modalities in
> one answer (reported the on-screen colours *and* the spoken words from a
> synthetic clip where each channel carried different information), accurate
> `MM:SS` timestamps, chained turns answering from prior context without
> resending the video, silent-video handling, and a 48h file expiry.
>
> Two corrections came out of it:
>
> 1. **`usage` is on the `interaction.completed` event** (`interaction.usage`),
>    not `step.delta.metadata.total_usage` — zero deltas ever carried it. The
>    original instrumentation would have logged 0 forever.
> 2. **The cost premise of this spec is wrong.** Video tokens are re-billed on
>    every turn (1,820 video tokens on turns 1, 2 and 3 alike), and
>    `total_cached_tokens` stayed 0 throughout — including on a separate
>    21.5k-token text prefix repeated back-to-back, which is well clear of the
>    4,096-token implicit-cache floor. The "~10× cheaper follow-ups" claim
>    below is **not reproducible**; `previous_interaction_id` saves the
>    re-upload, not the re-tokenization. The real saving over the 2024 design
>    comes from native video tokenization at 1 FPS, not from caching.
>
> Also confirmed by observation: `step.delta` really does emit non-text kinds
> (`thought_signature` appeared), so the `delta.type === "text"` filter is
> load-bearing, not defensive.
>
> Still unrun: the browser-level end-to-end flow through the Clerk-protected
> routes, rate-limit exhaustion, and the expiry/410 path.

## Context

Video Probe (Feb 2024, SUST CSE Carnival hackathon) lets a user upload a video and chat about it. The current system is two tiers:

- **`backend/`** — Flask. Two separate pipelines the user picks between via a model dropdown:
  - *audio*: moviepy → mp3 → 10MB chunks → Whisper → gpt-3.5 summary
  - *video*: OpenCV decodes **every** frame to base64 → every 20th frame → `gpt-4-vision-preview`
- **`frontend/`** — Next.js 14, Clerk auth, Prisma/Postgres, Upstash rate limiting, shadcn.

Four architectural problems drive this rewrite:

1. **The base64 frame array is the conversation.** It's stored in `Chat.messages Json[]` and resent to OpenAI on every follow-up. Cost grows linearly per turn and the context window dies on any real video.
2. **Modality is an either/or dropdown.** Picking `gpt-4-vision-preview` silently discards the audio track, and vice versa.
3. **No time dimension.** Nothing models timestamps, so "where in the video does X happen" is unanswerable.
4. **Synchronous long job over HTTP.** Upload blocks through transcode + transcription + inference with no progress, retry, or resumability.

Gemini's native video understanding collapses all four. It ingests mp4 directly — video and audio together, timestamped every second — so the entire Python tier becomes a file upload. The Interactions API holds conversation state server-side, so follow-ups reference `previous_interaction_id` instead of resending the video.

**Outcome:** one Next.js service, no Python, no frame extraction, timestamped answers, and follow-up turns that cost ~10× less via implicit caching.

### Decisions already made

| Decision | Choice | Consequence |
|---|---|---|
| Deploy target | **Self-hosted** (Docker/VPS) | Single multipart route handler; no 4.5MB Vercel body cap, no browser-direct upload, no CORS risk |
| Files API 48h expiry | **Read-only after expiry** | No blob store, no digest generation. Transcript stays viewable; new questions return 410 |
| Response delivery | **Streaming** | Route returns `ReadableStream`; client appends deltas |

---

## Verified API facts

Confirmed against `ai.google.dev` on 2026-07-29:

- **Model:** `gemini-3.6-flash` — current stable, video-capable, used in all video-understanding samples.
- **SDK:** `@google/genai` ≥ 2.3.0 (Interactions API requires 2.3.0+). `new GoogleGenAI({ apiKey })`.
- **Files API:** free, 2GB/file (free tier) or 20GB/project paid. **Files are hard-deleted after 48 hours.** Upload returns `{ uri, name, mimeType, state }`. Poll `files.get({ name })` while `state === "PROCESSING"`; states are `PROCESSING | ACTIVE | FAILED`. `expirationTime` is set only when the file is scheduled to expire.
- **Video input block** (verbatim from docs): `{ type: "video", uri: myfile.uri, mime_type: myfile.mimeType }`. Docs note content-part fields are **snake_case** (`mime_type`) while response objects are camelCase (`mimeType`).
- **Part order:** put the video part *before* the text part. One video per request.
- **Tokens:** 258 tokens/frame default, 66 tokens/frame at low `media_resolution`; audio 32 tokens/sec. ≈300 tokens/sec default, ≈100 tokens/sec low. Sampling is fixed at 1 FPS.
- **Interactions API:** GA June 2026. `store=true` by default; retention 55 days paid / **1 day free**. Chain turns with `previous_interaction_id`.
  - ⚠️ **`tools`, `system_instruction`, and `generation_config` are interaction-scoped and NOT inherited** — resend them every turn.
  - Not yet supported in Interactions: `video_metadata` (clip offsets), explicit caching, Batch API.
- **Implicit caching:** on by default for 2.5+ models, works with `previous_interaction_id`, **no storage charge**. Min 4096 tokens for 3.5-class models (a video is far over). Hit rate improves when the large content sits at the start of the prompt. Hits visible at `usage.total_cached_tokens`.
- **Pricing** (`gemini-3.6-flash`, standard tier): $1.50/1M input, $7.50/1M output, **$0.15/1M cached input**. Free tier available for standard tier.

### Cost model this produces

At `media_resolution: "low"` (~100 tokens/sec), a 10-minute video ≈ 60k tokens:

- First turn: 60k × $1.50/1M ≈ **$0.09**
- Each cached follow-up: 60k × $0.15/1M ≈ **$0.009**

The old design paid full price for the frame array on *every* turn. This is the single biggest win and it comes from `previous_interaction_id` + implicit caching, not from any code we write.

---

## Step 0 — Spike the SDK shapes first (~15 min, do this before anything else)

The Interactions API is new and the JS docs are thin on three specifics. Confirm them with a throwaway script (`spike.mjs`, delete afterward) rather than guessing, because all three are load-bearing:

```js
import { GoogleGenAI } from "@google/genai"
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// 1. Does files.upload accept a Web File/Blob, or only a path string?
//    Next.js formData() yields a Web File. If Blob is rejected, use the
//    tmp-file fallback in Step 4.
const f = await ai.files.upload({ file: <Blob>, config: { mime_type: "video/mp4" } })

// 2. Exact streaming event shape. Docs name the event types
//    (interaction.created / step.start / step.delta / step.stop /
//    interaction.completed) but not the field path to the text chunk.
//    Log one full event and read off where the text and the interaction id live.
const stream = await ai.interactions.create({
  model: "gemini-3.6-flash",
  input: [{ type: "video", uri: f.uri, mime_type: f.mimeType },
          { type: "text", text: "Summarise with timestamps." }],
  stream: true,
})
for await (const e of stream) console.dir(e, { depth: null })

// 3. generation_config casing for media resolution:
//    media_resolution vs mediaResolution, and the accepted value
//    ("low" / "MEDIA_RESOLUTION_LOW"). Send it and confirm the token count
//    in `usage` drops to roughly a third.
```

Record the answers at the top of `src/config/gemini.ts` as a comment. Everything below assumes the documented snake_case shape; adjust if the spike says otherwise.

---

## Step 1 — Delete

Entire directories and files. None of this has a Gemini equivalent; it was all workarounds for models that couldn't read video.

```
backend/                                  # whole Python tier — Flask, OpenCV, moviepy, pydub, Whisper, notebooks
frontend/src/actions/completion.ts        # dead: page.tsx uses /api/completion, not this server action
frontend/src/app/api/test/route.ts        # dead debug endpoint
frontend/src/app/api/chat/route.ts        # dead: nothing POSTs here; upload route creates the chat
frontend/src/config/ratelimit.ts          # unused duplicate (recreated properly in Step 3)
frontend/src/components/model-switcher.tsx # modality dropdown — Gemini reads both streams in one pass
frontend/src/components/app-context.tsx   # existed only to hold selectedModel
```

Follow-up edits required by those deletions:

- `src/app/layout.tsx` — drop the `AppContextProvider` import and unwrap it from the tree.
- `src/components/navbar.tsx` — remove the `ModelSelection` import (it's imported but never rendered).

**Do not** delete or rewrite: Clerk setup, `middleware.ts`, `config/redis.ts`, `config/prisma.ts`, `components/ui/*`, `file-dropzone.tsx`, `spinner.tsx`, `theme-*`, `lib/utils.ts`, `docker-compose.yml`. They work and are out of scope.

---

## Step 2 — Dependencies and environment

**`frontend/package.json`**

```diff
- "openai": "^4.28.0",
+ "@google/genai": "^2.3.0",
```

**`frontend/.env.example`** — remove `BACKEND_URL`, `BACKEND_API_KEY`, `OPENAI_API_KEY`; add:

```
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_MEDIA_RESOLUTION=low
MAX_UPLOAD_MB=500
```

Keep Clerk, Postgres, and Upstash vars unchanged.

**`frontend/src/config/env.ts`** — rewrite. The existing file types itself `Record<string, string>` while assigning possibly-`undefined` values, so the type lies to every consumer. Keep the eager startup validation (it catches real misconfiguration) but type it honestly and only validate what is genuinely required:

```ts
function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Environment variable ${name} is not defined`)
  return v
}

export const Env = {
  geminiApiKey: required("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  mediaResolution: process.env.GEMINI_MEDIA_RESOLUTION ?? "low",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024,
  upstashUrl: required("UPSTASH_REDIS_REST_URL"),
  upstashKey: required("UPSTASH_REDIS_REST_TOKEN"),
} as const
```

**`frontend/src/config/gemini.ts`** (new, 3 lines):

```ts
import { GoogleGenAI } from "@google/genai"
import { Env } from "./env"

export const ai = new GoogleGenAI({ apiKey: Env.geminiApiKey })
```

---

## Step 3 — Rate limiting

Today `Ratelimit` is instantiated in four places (`api/upload`, `api/chat`, `api/completion`, `api/test`) and `config/ratelimit.ts` — and **the upload route defines a limiter but never calls `.limit()`**. Consolidate into one file, two limiters, because uploads cost far more than turns.

**`frontend/src/config/ratelimit.ts`** (recreate):

```ts
import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "@/config/redis"

export const uploadLimit = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, "10 m") })
export const chatLimit   = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(25, "1 m") })
```

Both new routes must actually call `.limit(userId)` and return **429** on failure. Note the existing routes return 429 for *unauthenticated* requests too — that should be **401**; fix it in the new routes.

---

## Step 4 — Data model

The old schema stores the entire OpenAI message array — base64 frames included — in `Chat.messages Json[]`. Replace it with a chat row that points at a Gemini file plus a separate message table.

**Why a `Message` table rather than keeping a JSON column:**
- Interactions API retention is 1 day on the free tier, so server-side state is not a system of record for display.
- `updateChatHistory` currently does read-modify-write on the JSON array — two concurrent turns lose a message. A row insert is atomic.
- It cleanly separates the **display transcript** from the **model's context**, which is what lets the auto-generated first prompt stay hidden from the user (Step 6).

**`frontend/prisma/schema.prisma`**

```prisma
model Chat {
  id                String    @id @default(uuid())
  name              String    @default("New Chat")
  userId            String
  model             String    @default("gemini-3.6-flash")

  // Gemini Files API handle — expires 48h after upload
  fileUri           String
  fileName          String    // "files/abc123", needed for files.get / files.delete
  mimeType          String
  displayName       String
  fileExpiresAt     DateTime

  // Interactions API server-side conversation state
  lastInteractionId String?

  createdAt         DateTime  @default(now())
  messages          Message[]

  @@index([userId])
}

model Message {
  id        String   @id @default(uuid())
  chatId    String
  role      String   // "user" | "model"
  content   String
  createdAt DateTime @default(now())
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@index([chatId, createdAt])
}
```

**Migration.** This is a breaking change and existing rows hold OpenAI-format base64 frames that are worthless under Gemini. Do not attempt data migration — drop and recreate:

```bash
bunx prisma migrate reset      # dev only; wipes the DB
bunx prisma migrate dev --name gemini_overhaul
```

`onDelete: Cascade` also removes the need to manually clear messages in `deleteChat`.

---

## Step 5 — Upload route

**`frontend/src/app/api/upload/route.ts`** — full rewrite.

Responsibilities: auth → rate limit → size check → upload to Files API → poll to `ACTIVE` → create `Chat` row → return `chatId`. It does **not** run inference; the first turn happens on the chat page through the streaming endpoint (Step 6), so upload returns as soon as the file is processed.

```ts
export const maxDuration = 300   // long videos take minutes to reach ACTIVE
```

Sequence:

1. `const { userId } = auth()` → 401 if absent.
2. `await uploadLimit.limit(userId)` → 429 if `!success`.
3. `const file = (await request.formData()).get("file") as File` → 400 if missing.
4. Reject if `file.size > Env.maxUploadBytes` (400) or the MIME type isn't in the accepted set (`video/mp4`, `video/x-matroska`, `video/quicktime`, `video/webm`) (415).
5. Upload:
   ```ts
   const uploaded = await ai.files.upload({
     file,                                    // Web File is a Blob
     config: { mime_type: file.type, display_name: file.name },
   })
   ```
   **Fallback if the Step 0 spike shows Blob is rejected:** write to `os.tmpdir()` under a `randomUUID()` filename, pass that path, and `fs.unlink` it in a `finally`. Use `randomUUID()`, never `file.name` — the original `f.save(f.filename)` in `backend/app.py` wrote a client-controlled path and was a directory-traversal hole. Do not reintroduce it.
6. Poll to ready:
   ```ts
   let f = uploaded
   const deadline = Date.now() + 4 * 60_000
   while (f.state === "PROCESSING") {
     if (Date.now() > deadline) throw new Error("File processing timed out")
     await new Promise(r => setTimeout(r, 2000))
     f = await ai.files.get({ name: f.name })
   }
   if (f.state === "FAILED") throw new Error(f.error?.message ?? "File processing failed")
   ```
7. Create the chat. `expirationTime` is only present when set, so fall back to 48h from now:
   ```ts
   const chat = await prismaClient.chat.create({
     data: {
       userId,
       model: Env.geminiModel,
       fileUri: f.uri,
       fileName: f.name,
       mimeType: f.mimeType,
       displayName: file.name,
       fileExpiresAt: f.expirationTime
         ? new Date(f.expirationTime)
         : new Date(Date.now() + 48 * 3600 * 1000),
     },
   })
   ```
8. `revalidatePath("/")`, return `Response.json({ chatId: chat.id })`.

Wrap 5–7 in try/catch; log server-side and return a generic message with the right status. On failure after upload succeeded, best-effort `ai.files.delete({ name: f.name })` so orphans don't eat the 20GB project quota.

**Self-hosting note:** put `client_max_body_size 500M;` and `proxy_read_timeout 300s;` in the nginx config, or uploads fail at the proxy before Next.js ever sees them.

---

## Step 6 — Streaming turn route

**`frontend/src/app/api/chat/[id]/route.ts`** (new; replaces `api/completion/route.ts`, which is deleted).

`POST` body: `{ prompt?: string }`. When `prompt` is omitted this is the **ingest turn** — use the default prompt and do not persist a user message, so the transcript opens with the model's summary rather than a canned question the user didn't type.

```ts
const INGEST_PROMPT =
  "Describe the key events in this video, providing both audio and visual details. " +
  "Include timestamps for salient moments."

const SYSTEM_INSTRUCTION =
  "You are a video question answering assistant. Answer only from the video's " +
  "audio and visual content. Cite moments as MM:SS. If the video does not " +
  "contain the answer, say so plainly."
```

Sequence:

1. `auth()` → **401** if absent.
2. `chatLimit.limit(userId)` → 429.
3. Load with ownership scoping in the query — the old `updateChatHistory` looked up by `chatId` alone and was an IDOR:
   ```ts
   const chat = await prismaClient.chat.findUnique({ where: { id: params.id, userId } })
   if (!chat) return Response.json({ message: "Not found" }, { status: 404 })
   ```
4. Expiry gate:
   ```ts
   if (chat.fileExpiresAt < new Date())
     return Response.json({ message: "Video expired. Re-upload to continue." }, { status: 410 })
   ```
5. Persist the user message (skip entirely on the ingest turn).
6. Build the request. **First turn sends the video; every later turn sends only text and chains by id.** `system_instruction` and `generation_config` are resent every turn because Interactions does not inherit them:
   ```ts
   const isFirst = !chat.lastInteractionId
   const common = {
     model: chat.model,
     system_instruction: SYSTEM_INSTRUCTION,
     generation_config: { media_resolution: Env.mediaResolution },  // confirm casing in Step 0
     stream: true as const,
   }

   const stream = isFirst
     ? await ai.interactions.create({
         ...common,
         input: [
           { type: "video", uri: chat.fileUri, mime_type: chat.mimeType },  // video FIRST
           { type: "text", text: prompt ?? INGEST_PROMPT },
         ],
       })
     : await ai.interactions.create({
         ...common,
         previous_interaction_id: chat.lastInteractionId,
         input: prompt,
       })
   ```
7. Stream to the client while accumulating, then persist once on completion:
   ```ts
   const encoder = new TextEncoder()
   return new Response(new ReadableStream({
     async start(controller) {
       let full = "", interactionId: string | undefined
       try {
         for await (const event of stream) {
           // field paths below are the Step 0 spike's job to confirm
           if (event.type === "interaction.created") interactionId = event.interaction?.id
           if (event.type === "step.delta" && event.delta?.text) {
             full += event.delta.text
             controller.enqueue(encoder.encode(event.delta.text))
           }
           if (event.type === "interaction.completed") interactionId ??= event.interaction?.id
         }
         await prismaClient.$transaction([
           prismaClient.message.create({ data: { chatId: chat.id, role: "model", content: full } }),
           prismaClient.chat.update({
             where: { id: chat.id },
             data: {
               lastInteractionId: interactionId,
               // name the chat from the first real user prompt
               ...(prompt && chat.name === "New Chat"
                 ? { name: prompt.slice(0, 60) }
                 : {}),
             },
           }),
         ])
       } catch (err) {
         console.error("chat turn failed:", err)
         controller.error(err)
         return
       }
       controller.close()
     },
   }), {
     headers: {
       "Content-Type": "text/plain; charset=utf-8",
       "Cache-Control": "no-cache, no-transform",
       "X-Accel-Buffering": "no",   // required or nginx buffers the whole stream
     },
   })
   ```

`lastInteractionId` must only be written after the stream completes — a half-written turn should not become the parent of the next one.

---

## Step 7 — Server actions

**`frontend/src/actions/chat.ts`** — trim to what's still used, all `userId`-scoped:

- `getChat(id)` → include `messages` ordered by `createdAt asc`; keep the existing `{ id, userId }` scoping.
- `getChats()` → `orderBy: { createdAt: "desc" }`.
- `deleteChat(chatId)` → also best-effort `ai.files.delete({ name: chat.fileName })` before the row delete, so uploads don't linger against the project quota. Messages cascade.
- **Delete** `createChat` (upload route owns creation) and `updateChatHistory` (the turn route persists, and its read-modify-write was racy).

---

## Step 8 — Client

**`frontend/src/app/page.tsx`** (upload screen)
Remove `ModelSelection` and the `AppContext` usage. `onFileSubmit` POSTs to `/api/upload`, then `router.push(\`/chat/${chatId}\`)`. Surface real errors — the current version swallows them into `console.error` and leaves the user staring at a dead spinner. Show the failure text and re-enable the button. Keep `FileUpload` / `FileDropzoneComponent` as-is, but widen `allowedFileTypes` to match the route's accepted MIME set.

**`frontend/src/app/chat/[id]/page.tsx`**
Convert to a server component: fetch the chat + messages via `getChat`, pass them as props. Removes the client-side fetch-on-mount flash.

**`frontend/src/components/chat.tsx`** — rewrite. Current bugs to fix while replacing it:
- `messages.push(promptEntry)` mutates state directly
- no `key` on the mapped list
- `messages.slice(2)` hardcoded to hide the old system/frame entries — unnecessary now that the transcript holds only display messages
- `//@ts-ignore` on the model field

New behaviour:
- Receives `initialMessages` and `isExpired` as props.
- **Auto-fires the ingest turn**: on mount, if `initialMessages.length === 0`, POST to `/api/chat/[id]` with an empty body. Guard with a ref so React 18 StrictMode's double-mount doesn't fire it twice.
- Reads the stream:
  ```ts
  const res = await fetch(`/api/chat/${chatId}`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) { setError((await res.json()).message); return }
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  setMessages(m => [...m, { role: "model", content: "" }])
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    setMessages(m => {
      const next = [...m]
      next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + chunk }
      return next
    })
  }
  ```
- When `isExpired`, disable the input and render "Video expired after 48 hours — upload it again to continue." with a link to `/`.
- Handle the 410 mid-session the same way.

**`frontend/src/components/sidebar.tsx`** — add the missing `key={chat.id}` on the mapped list.

**`frontend/src/components/delete-chat-button.tsx`** — drop the `async` on the client component (an async function component is invalid for client components; it works today only because it's never suspended).

**`frontend/src/app/layout.tsx`** — unwrap `AppContextProvider`; set a real `metadata.title` ("Video Probe") instead of the create-next-app default.

---

## Step 9 — Docs and cleanup

- **`README.md`** — rewrite setup: one service, `GEMINI_API_KEY`, `docker compose up` for Postgres, `bunx prisma migrate dev`, `bun dev`. Remove all Flask/Python instructions. Keep the hackathon credit line and the demo video link.
- **`frontend/.dockerenv.example`** — unchanged (Postgres only).
- **Optional, last:** `git mv frontend/* .` and delete the now-empty `frontend/`. The directory name is misleading once it's the whole app. Pure churn with no functional effect — do it only after everything below verifies green, or skip it.

---

## Explicitly out of scope

Leave alone unless they actively break: Next.js 14.1 → 15/16, Clerk v4 `authMiddleware` → v5+ `clerkMiddleware`, and the shadcn component set. All are working, none are required by this overhaul, and bundling framework upgrades into a provider migration makes failures ambiguous.

---

## Verification

Run in order; each step gates the next.

1. **Spike (Step 0)** — `node spike.mjs` prints a streamed description with `MM:SS` timestamps. Confirms key, model id, video part shape, and delta field path. Delete the file afterward.
2. **Build** — `bun install && bunx prisma generate && bun run build` completes with no type errors. Confirms every `openai` import is gone.
3. **DB** — `docker compose up -d`, `bunx prisma migrate reset`, then `bunx prisma studio` shows `Chat` and `Message` with the new columns.
4. **Short video, happy path** — sign in, upload a ~30s mp4 **with speech**. Expect: redirect to `/chat/[id]`, summary streams in token-by-token, and it references **both** what is said and what is shown. That single response proves the fix for problem #2 (modality either/or) — the old system could only do one.
5. **Timestamps** — ask "what happens at 00:10?" Answer should cite the moment. Proves problem #3.
6. **Caching / the core win** — ask three follow-ups. Log `usage.total_cached_tokens` in the turn route. Expect near-zero cached tokens on turn 1 and a large cached count from turn 2 on. Then confirm in Prisma Studio that **`Message.content` holds only text and the video is never re-sent** — this is the fix for problem #1.
7. **Media resolution** — flip `GEMINI_MEDIA_RESOLUTION` between `low` and `default`, re-upload, compare `usage` input tokens. Low should be roughly one third. Confirms the casing found in Step 0 actually takes effect rather than being silently ignored.
8. **Silent-video regression** — upload a video with no audio track. Must still describe it. The old system needed a separate pipeline and a dropdown for this.
9. **Large file** — upload something over 100MB. Confirms nginx `client_max_body_size`, `maxDuration`, and the `PROCESSING` poll loop all hold. Watch for the poll timing out rather than hanging.
10. **Expiry** — manually set a chat's `fileExpiresAt` to the past in Prisma Studio, reload. Transcript renders, input is disabled, and a direct POST to the turn route returns 410.
11. **Ownership** — sign in as user B and POST to user A's `/api/chat/[id]`. Must return 404, not a valid turn. This is the IDOR that exists in `updateChatHistory` today.
12. **Rate limits** — 6 uploads inside 10 minutes → 429 on the sixth. 26 turns in a minute → 429. Confirms `.limit()` is actually being called, which it is not in the current upload route.
13. **Cleanup** — delete a chat, then `ai.files.list()` and confirm its file is gone. Also confirm cascade removed its messages.
14. **StrictMode** — in dev, open a fresh chat and confirm the ingest turn fires exactly **once** (one model message, one interaction). The mount guard is easy to get wrong.
