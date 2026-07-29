import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { Env } from "@/config/env"
import { ai } from "@/config/gemini"
import { prismaClient } from "@/config/prisma"
import { chatLimit } from "@/config/ratelimit"
import { toGeminiVideoMime } from "@/lib/mime"

export const maxDuration = 300

const INGEST_PROMPT =
    "Describe the key events in this video, providing both audio and visual " +
    "details. Include timestamps for salient moments."

const numeric = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null

const SYSTEM_INSTRUCTION =
    "You are a video question answering assistant. Answer only from the " +
    "video's audio and visual content. Cite moments as MM:SS. If the video " +
    "does not contain the answer, say so plainly."

export async function POST(
    request: Request,
    // Next 16: params is a Promise.
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const { userId } = await auth()
    if (!userId)
        return Response.json({ message: "Unauthorized" }, { status: 401 })

    const { success } = await chatLimit().limit(userId)
    if (!success)
        return Response.json(
            { message: "Rate limit exceeded" },
            { status: 429 }
        )

    // Scope by userId in the query itself — looking up by id alone and
    // checking ownership afterwards is how the previous version leaked.
    const chat = await prismaClient.chat.findUnique({ where: { id, userId } })
    if (!chat) return Response.json({ message: "Not found" }, { status: 404 })

    // Null expiry means a YouTube source — Gemini refetches the URL each
    // turn, so there is nothing to go stale.
    if (chat.fileExpiresAt && chat.fileExpiresAt < new Date())
        return Response.json(
            {
                message:
                    "This video expired after 48 hours. Upload it again to continue."
            },
            { status: 410 }
        )

    let prompt: string | undefined
    try {
        const body = await request.json().catch(() => ({}))
        if (typeof body?.prompt === "string" && body.prompt.trim())
            prompt = body.prompt.trim()
    } catch {
        // no body — treated as the ingest turn
    }

    // The ingest turn is system-initiated, so its prompt is deliberately not
    // written to the transcript: the user sees the summary, not the question
    // we asked on their behalf. Gemini still has it in server-side context.
    const isIngest = !prompt
    if (!isIngest) {
        await prismaClient.message.create({
            data: { chatId: chat.id, role: "user", content: prompt! }
        })
    }

    const client = ai()
    const isFirstTurn = !chat.lastInteractionId

    // system_instruction and generation_config are interaction-scoped and are
    // NOT inherited through previous_interaction_id — they must be resent
    // on every turn or the model silently loses them.
    const common = {
        model: chat.model,
        system_instruction: SYSTEM_INSTRUCTION,
        generation_config: { temperature: 0.2 },
        stream: true as const
    }

    let stream
    try {
        stream = isFirstTurn
            ? await client.interactions.create({
                  ...common,
                  input: [
                      // Video first: it's the large, stable prefix, which is
                      // what makes implicit caching hit on later turns.
                      {
                          type: "video" as const,
                          uri: chat.fileUri,
                          // Also normalised at upload; repeated here so rows
                          // written before that fix still work.
                          mime_type:
                              toGeminiVideoMime(chat.mimeType) ?? chat.mimeType,
                          resolution: Env.mediaResolution
                      },
                      { type: "text" as const, text: prompt ?? INGEST_PROMPT }
                  ]
              })
            : await client.interactions.create({
                  ...common,
                  previous_interaction_id: chat.lastInteractionId!,
                  input: prompt!
              })
    } catch (error) {
        console.error(`/api/chat/${id} create failed:`, error)
        return Response.json(
            { message: "The model could not be reached. Please try again." },
            { status: 502 }
        )
    }

    const encoder = new TextEncoder()

    return new Response(
        new ReadableStream({
            async start(controller) {
                let full = ""
                let interactionId: string | undefined
                let usage: Record<string, unknown> | undefined

                try {
                    for await (const event of stream) {
                        switch (event.event_type) {
                            case "interaction.created":
                                interactionId = event.interaction?.id
                                break
                            case "step.delta":
                                // The delta union includes thought summaries,
                                // thought signatures and tool calls — all of
                                // which do arrive in practice. Only "text" is
                                // user-facing; forwarding the rest would leak
                                // the model's private reasoning as if it were
                                // the answer.
                                if (event.delta?.type === "text") {
                                    full += event.delta.text
                                    controller.enqueue(
                                        encoder.encode(event.delta.text)
                                    )
                                }
                                break
                            case "interaction.completed":
                                interactionId ??= event.interaction?.id
                                // Usage rides on the completion event only —
                                // step.delta.metadata is always empty.
                                usage = event.interaction?.usage as
                                    | Record<string, unknown>
                                    | undefined
                                break
                        }
                    }
                } catch (error) {
                    console.error(`/api/chat/${id} stream failed:`, error)
                    controller.error(error)
                    return
                }

                try {
                    // Only advance lastInteractionId once the turn actually
                    // finished — a truncated turn must not become the parent
                    // of the next one.
                    await prismaClient.$transaction([
                        prismaClient.message.create({
                            data: {
                                chatId: chat.id,
                                role: "model",
                                content: full,
                                inputTokens: numeric(usage?.total_input_tokens),
                                outputTokens: numeric(usage?.total_output_tokens)
                            }
                        }),
                        prismaClient.chat.update({
                            where: { id: chat.id },
                            data: {
                                ...(interactionId
                                    ? { lastInteractionId: interactionId }
                                    : {}),
                                ...(prompt && chat.name === "New Chat"
                                    ? { name: prompt.slice(0, 60) }
                                    : {})
                            }
                        })
                    ])
                    revalidatePath("/")
                } catch (error) {
                    console.error(`/api/chat/${id} persist failed:`, error)
                }

                console.log(
                    `[chat ${id}] turn ok —`,
                    `input=${usage?.total_input_tokens ?? "?"}`,
                    `cached=${usage?.total_cached_tokens ?? "?"}`,
                    `output=${usage?.total_output_tokens ?? "?"}`
                )
                controller.close()
            }
        }),
        {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                // Without this nginx buffers the whole response and streaming
                // silently degrades to a single blocking chunk.
                "X-Accel-Buffering": "no"
            }
        }
    )
}
