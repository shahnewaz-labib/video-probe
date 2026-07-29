import "server-only"

import { createWriteStream } from "node:fs"
import { mkdir, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

/**
 * Originals are kept on local disk so the chat can play the video back and
 * seek to cited timestamps — the Files API deletes uploads after 48h and
 * offers no download. This app is self-hosted, so a disk is the whole
 * dependency; no bucket, no cloud account.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? ".uploads"

/** Chat ids are server-generated UUIDs, so they're safe as filenames. */
export function videoPath(chatId: string): string {
    return path.join(process.cwd(), UPLOAD_DIR, chatId)
}

/** Streams the upload to disk without buffering a second copy in memory. */
export async function saveVideo(chatId: string, file: File): Promise<string> {
    const dest = videoPath(chatId)
    await mkdir(path.dirname(dest), { recursive: true })
    await pipeline(
        Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
        createWriteStream(dest)
    )
    return dest
}

export async function videoSize(chatId: string): Promise<number | null> {
    try {
        return (await stat(videoPath(chatId))).size
    } catch {
        return null
    }
}

export async function deleteVideo(chatId: string): Promise<void> {
    await unlink(videoPath(chatId)).catch(() => {})
}
