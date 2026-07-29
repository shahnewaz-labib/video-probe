import { auth } from "@clerk/nextjs/server"
import { randomUUID } from "node:crypto"
import { FileState } from "@google/genai"
import { revalidatePath } from "next/cache"
import { NextRequest } from "next/server"

import { Env } from "@/config/env"
import { ai } from "@/config/gemini"
import { prismaClient } from "@/config/prisma"
import { uploadLimit } from "@/config/ratelimit"
import { ACCEPTED_EXTENSIONS, toGeminiVideoMime } from "@/lib/mime"
import { isAllowedModel } from "@/lib/models"
import { deleteVideo, saveVideo } from "@/lib/storage"

// Reaching ACTIVE can take minutes on a long video.
export const maxDuration = 300

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 4 * 60_000
const FILES_API_TTL_MS = 48 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
    const { userId } = await auth()
    if (!userId)
        return Response.json({ message: "Unauthorized" }, { status: 401 })

    const { success } = await uploadLimit().limit(userId)
    if (!success)
        return Response.json(
            { message: "Too many uploads. Try again shortly." },
            { status: 429 }
        )

    // A body truncated by proxyClientMaxBodySize arrives as invalid multipart,
    // so this throws rather than yielding a short file. Answer with JSON —
    // letting it bubble returns an HTML error page the client can't parse.
    let form: FormData
    try {
        form = await request.formData()
    } catch (error) {
        console.error("/api/upload: could not parse body —", error)
        return Response.json(
            {
                message:
                    `Upload body was rejected or truncated. If the file is near ` +
                    `${Env.maxUploadBytes / 1024 / 1024}MB, raise MAX_UPLOAD_MB ` +
                    `(next.config.mjs derives the proxy limit from it).`
            },
            { status: 413 }
        )
    }

    // Never trust a model id off the wire — it goes straight to a paid API.
    const requested = form.get("model")
    const model =
        typeof requested === "string" && (await isAllowedModel(requested))
            ? requested
            : Env.geminiModel

    const file = form.get("file")
    if (!(file instanceof File) || file.size === 0)
        return Response.json({ message: "No file uploaded" }, { status: 400 })
    if (file.size > Env.maxUploadBytes)
        return Response.json(
            {
                message: `File is larger than ${Env.maxUploadBytes / 1024 / 1024}MB`
            },
            { status: 413 }
        )
    // Normalise before upload: the Files API is laxer than inference, so an
    // un-normalised type uploads fine and then fails on the first turn.
    const geminiMime = toGeminiVideoMime(file.type)
    if (!geminiMime)
        return Response.json(
            {
                message:
                    `Gemini can't read ${file.type || "that file type"}. ` +
                    `Supported: ${ACCEPTED_EXTENSIONS.join(", ")}.`
            },
            { status: 415 }
        )

    const client = ai()
    let fileName: string | undefined
    // Generated up front so it can name the file on disk, avoiding a
    // temp-file-then-rename dance.
    const chatId = randomUUID()

    try {
        // Kept locally so the chat can play the video back and seek to cited
        // timestamps: the Files API deletes uploads after 48h and offers no
        // download. Streamed to disk, then handed to Gemini by path, so the
        // bytes are never buffered a second time.
        const localPath = await saveVideo(chatId, file)

        let uploaded = await client.files.upload({
            file: localPath,
            config: { mimeType: geminiMime, displayName: file.name }
        })
        fileName = uploaded.name

        const deadline = Date.now() + POLL_TIMEOUT_MS
        while (uploaded.state === FileState.PROCESSING) {
            if (Date.now() > deadline)
                throw new Error("Timed out waiting for Gemini to process the video")
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
            uploaded = await client.files.get({ name: fileName! })
        }

        if (uploaded.state === FileState.FAILED)
            throw new Error(
                uploaded.error?.message ?? "Gemini could not process the video"
            )
        if (!uploaded.uri || !uploaded.name)
            throw new Error("Gemini returned no file URI")

        const chat = await prismaClient.chat.create({
            data: {
                id: chatId,
                userId,
                model,
                fileUri: uploaded.uri,
                fileName: uploaded.name,
                // Store the normalised type, not what the browser reported.
                mimeType: geminiMime,
                displayName: file.name,
                // expirationTime is only set when the file is scheduled to
                // expire; fall back to the documented 48h window.
                fileExpiresAt: uploaded.expirationTime
                    ? new Date(uploaded.expirationTime)
                    : new Date(Date.now() + FILES_API_TTL_MS)
            }
        })

        revalidatePath("/")
        return Response.json({ chatId: chat.id })
    } catch (error) {
        console.error("/api/upload:", error)
        // Don't leave a half-finished upload against the 20GB project quota,
        // or an orphaned file on disk with no row pointing at it.
        if (fileName) {
            await client.files
                .delete({ name: fileName })
                .catch((e) => console.error("orphan cleanup failed:", e))
        }
        await deleteVideo(chatId)
        return Response.json(
            { message: "Could not process that video. Please try again." },
            { status: 502 }
        )
    }
}
