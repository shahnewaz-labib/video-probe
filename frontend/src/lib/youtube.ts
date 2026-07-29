export const YOUTUBE_MIME = "video/vnd.youtube.yt"

const HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com"
])

// 11-char base64url id.
const ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Extracts the video id from the URL forms people actually paste.
 * Returns null for anything that isn't a public YouTube video URL —
 * Gemini rejects private and unlisted videos, and we don't want to spend
 * a turn discovering that.
 */
export function parseYouTubeId(input: string): string | null {
    let url: URL
    try {
        url = new URL(input.trim())
    } catch {
        return null
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    if (!HOSTS.has(url.hostname.toLowerCase())) return null

    // youtu.be/<id>
    if (url.hostname.toLowerCase().endsWith("youtu.be")) {
        const id = url.pathname.slice(1).split("/")[0]
        return ID.test(id) ? id : null
    }

    // youtube.com/watch?v=<id>
    const v = url.searchParams.get("v")
    if (v && ID.test(v)) return v

    // /shorts/<id>, /live/<id>, /embed/<id>, /v/<id>
    const segments = url.pathname.split("/").filter(Boolean)
    if (segments.length >= 2) {
        const [prefix, candidate] = segments
        if (["shorts", "live", "embed", "v"].includes(prefix) && ID.test(candidate))
            return candidate
    }

    return null
}

/** Canonical form, so the same video pasted three ways is one URL. */
export function canonicalYouTubeUrl(id: string): string {
    return `https://www.youtube.com/watch?v=${id}`
}

/**
 * Real video title via oEmbed — public, no API key, no quota.
 * Falls back to the id, since a missing title shouldn't fail the request.
 */
export async function fetchYouTubeTitle(id: string): Promise<string> {
    try {
        const res = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(
                canonicalYouTubeUrl(id)
            )}&format=json`,
            { signal: AbortSignal.timeout(5_000) }
        )
        if (!res.ok) return id
        const json = (await res.json()) as { title?: string }
        return json.title?.trim() || id
    } catch {
        return id
    }
}
