import { auth } from "@clerk/nextjs/server"
import { createReadStream } from "node:fs"
import { Readable } from "node:stream"

import { prismaClient } from "@/config/prisma"
import { parseRange } from "@/lib/range"
import { videoPath, videoSize } from "@/lib/storage"

/**
 * Serves the locally stored original so the player can seek.
 *
 * Range support is not optional: without 206 + Content-Range, browsers will
 * play the file but refuse to scrub it, which breaks the whole
 * click-a-timestamp interaction.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    // Ownership scoped in the query — these are private uploads.
    const chat = await prismaClient.chat.findUnique({
        where: { id, userId },
        select: { mimeType: true }
    })
    if (!chat) return new Response("Not found", { status: 404 })

    const size = await videoSize(id)
    if (size === null)
        return new Response("Video file is no longer on disk", { status: 404 })

    const path = videoPath(id)
    const headers = {
        "Content-Type": chat.mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600"
    }

    const range = parseRange(request.headers.get("range"), size)

    if (range.kind === "unsatisfiable")
        return new Response("Requested range not satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${size}` }
        })

    if (range.kind === "full")
        return new Response(toWeb(createReadStream(path)), {
            status: 200,
            headers: { ...headers, "Content-Length": String(size) }
        })

    const { start, end } = range
    return new Response(toWeb(createReadStream(path, { start, end })), {
        status: 206,
        headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Content-Length": String(end - start + 1)
        }
    })
}

function toWeb(stream: ReturnType<typeof createReadStream>) {
    return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
}
