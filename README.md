# Video Probe

Upload a video, then ask questions about what's in it — audio and visuals together, with `MM:SS` timestamps in the answers.

Originally built during the **SUST CSE Carnival 2024 Hackathon**, earning a Top 9 finish among 100+ teams. Rewritten in 2026 on Gemini's native video understanding.

https://github.com/user-attachments/assets/0d03d340-c8bb-4bf6-88ec-e100a2eaca9b

Two ways in: **upload a file**, or **paste a YouTube link**. Answers cite `MM:SS`, and clicking a citation seeks the player to that moment.

## How it works

Gemini ingests the mp4 directly, so there is no frame extraction, no transcoding, and no separate transcription step. The 2024 version needed all three; this one is a file upload.

1. `POST /api/upload` streams the video to the Gemini **Files API** and polls until it reaches `ACTIVE`. It also keeps the original on local disk so the player can seek. For links, `POST /api/youtube` skips all of that — Gemini fetches the URL itself, so there's no upload, no disk copy, and **no 48-hour expiry**.
2. The first turn sends the video part plus a prompt and creates an **Interaction**.
3. Every later turn sends only text and chains with `previous_interaction_id`.

Gemini holds the conversation state server-side, so the file is uploaded once and the client never resends it. The database stores a *display transcript* only — never the model's context. That separation is what lets the auto-generated ingest prompt stay hidden from the user while Gemini still has it.

### Cost — measured, not assumed

**The video is re-tokenized on every turn.** `previous_interaction_id` avoids re-*uploading* the file, but the video remains part of the replayed history and is billed again each turn. Measured on a 20-second clip at `low` resolution:

| turn | total input | of which video | cached |
|---|---|---|---|
| 1 (video sent) | 1,832 | 1,820 | 0 |
| 2 (chained) | 1,938 | 1,820 | 0 |
| 3 (chained) | 2,003 | 1,820 | 0 |

That works out to ~91 tokens per second of video, matching the documented ~100/sec at low resolution. Implicit caching did **not** engage in testing — `total_cached_tokens` stayed 0 even on a separate 21.5k-token text prefix repeated across three back-to-back turns. Treat any cached-token discount as unproven here.

Practical figure: a 10-minute video is ≈55k tokens **per turn**, so ~$0.08 a turn at $1.50/1M — roughly $0.8 for a ten-turn conversation, not the ~$0.17 that caching would imply.

The saving over the 2024 version is real but comes from **tokenization, not caching**: native video at 1 FPS/low resolution is far cheaper than base64 frames billed as images, and history no longer carries image payloads.

`media_resolution` is therefore the main cost lever, and it matters on every turn — `low` is roughly a third of default. Check the [current rate card](https://ai.google.dev/gemini-api/docs/pricing) before running long videos.

> **If cost matters more than fidelity on long videos**, the cheaper architecture is to generate one detailed timestamped digest at ingest and chat over that text instead of the video — ~2k tokens a turn rather than ~55k. It loses the ability to answer visual questions the digest didn't anticipate.

## Stack

Next.js 16 · React 19 · Clerk 7 · Prisma 7 / Postgres 18 · Upstash rate limiting · Tailwind 4 · TypeScript 7 · `@google/genai`

## Setup

Requires **Node 24** (pinned in `.node-version`; `fnm use` picks it up) and [Bun](https://bun.sh).

```bash
cd frontend
fnm use                     # or: nvm use
bun install
cp .env.example .env        # fill in the values below
docker compose up -d        # Postgres 18 on host port 5434
bunx prisma generate        # writes to src/generated/prisma (not node_modules)
bunx prisma migrate dev
bun dev
```

> Prisma 7 generates its client outside `node_modules`, so `prisma generate`
> must run before the first build. The connection string lives in
> `prisma.config.ts` for the CLI and reaches the client through the
> `@prisma/adapter-pg` driver adapter — `schema.prisma` no longer has a `url`.

### Environment

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Defaults to `gemini-3.6-flash` |
| `GEMINI_MEDIA_RESOLUTION` | `low` (default) \| `medium` \| `high` \| `ultra_high` |
| `MAX_UPLOAD_MB` | Defaults to 500 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | [Clerk](https://clerk.com) |
| `DATABASE_URL` | Matches `docker-compose.yml` out of the box |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | [Upstash](https://upstash.com) |

## Deploying

Built for self-hosting. Two body limits sit in front of an upload, and both bite:

**1. Next's proxy buffer.** Because `proxy.ts` matches `/api/*`, Next clones and buffers the whole request body in memory so proxy and route can both read it. The default cap is 10MB and **overflow truncates silently instead of erroring** — a corrupt multipart body, not a clear failure. `next.config.mjs` derives `experimental.proxyClientMaxBodySize` from `MAX_UPLOAD_MB` so the two can't drift, and the upload route returns a JSON 413 if a truncated body slips through anyway.

Note the memory cost: an N-MB upload holds ~N MB of RAM for its duration. Raising `MAX_UPLOAD_MB` raises that too. The flag is also still marked experimental upstream.

**2. Your reverse proxy.**

```nginx
client_max_body_size 500M;
proxy_read_timeout   300s;
proxy_buffering      off;   # or responses stream in one blocking chunk
```

Vercel will not work as-is — its ~4.5MB request body cap rejects video uploads.

For genuinely large files the right fix on either host is to stop routing bytes through the app: have the server mint a Gemini resumable upload session and let the browser `PUT` directly to it. That sidesteps the proxy buffer, the memory cost, and Vercel's cap in one move.

## Known limitations

- **YouTube links must be public.** Private and unlisted videos are rejected by Gemini. The free tier also caps YouTube input at 8 hours of video per day.
- **Long links are expensive.** Because video is re-billed each turn, a one-hour YouTube video runs ~320k tokens per question (~$0.48). Pasting a link costs no effort, so it's easy to start an expensive conversation by accident.
- **Uploaded videos expire after 48 hours.** The Files API hard-deletes uploads, so an older chat becomes read-only: the transcript still renders, but new questions return 410 and the UI prompts for a re-upload. Fixing this properly means keeping the original in your own bucket and re-uploading on demand.
- **Sampling is 1 FPS**, so fast motion between frames can be missed.
- **One video per chat.**
