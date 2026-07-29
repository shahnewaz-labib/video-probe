import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { Env } from "@/config/env"
import { prismaClient } from "@/config/prisma"
import { uploadLimit } from "@/config/ratelimit"
import { isAllowedModel } from "@/lib/models"
import {
    YOUTUBE_MIME,
    canonicalYouTubeUrl,
    fetchYouTubeTitle,
    parseYouTubeId
} from "@/lib/youtube"

/**
 * There is no upload step: Gemini fetches the video itself, so this just
 * validates the URL and creates the chat. fileName and fileExpiresAt stay
 * null — nothing to delete, and a YouTube chat never goes read-only.
 */
export async function POST(request: Request) {
    const { userId } = await auth()
    if (!userId)
        return Response.json({ message: "Unauthorized" }, { status: 401 })

    const { success } = await uploadLimit().limit(userId)
    if (!success)
        return Response.json(
            { message: "Too many videos added. Try again shortly." },
            { status: 429 }
        )

    const body = await request.json().catch(() => ({}))

    const videoId = typeof body?.url === "string" ? parseYouTubeId(body.url) : null
    if (!videoId)
        return Response.json(
            { message: "That doesn't look like a YouTube video URL." },
            { status: 400 }
        )

    const model =
        typeof body?.model === "string" && (await isAllowedModel(body.model))
            ? body.model
            : Env.geminiModel

    const url = canonicalYouTubeUrl(videoId)

    // Same video twice shouldn't make a second chat.
    const existing = await prismaClient.chat.findFirst({
        where: { userId, fileUri: url },
        select: { id: true }
    })
    if (existing) return Response.json({ chatId: existing.id })

    const chat = await prismaClient.chat.create({
        data: {
            userId,
            model,
            source: "youtube",
            fileUri: url,
            mimeType: YOUTUBE_MIME,
            displayName: await fetchYouTubeTitle(videoId),
            fileName: null,
            fileExpiresAt: null
        }
    })

    revalidatePath("/")
    return Response.json({ chatId: chat.id })
}
