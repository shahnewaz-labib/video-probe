import "server-only"

import { Env } from "@/config/env"
import { ai } from "@/config/gemini"

export type VideoModel = {
    id: string
    label: string
    /** "Lite" | "Flash" | "Pro" */
    tier: string
    hint: string
}

/**
 * Derived from the model family, not measured. Google doesn't publish
 * per-model latency, so these are directional labels to make the picker a
 * real choice rather than a list of opaque names — not benchmarks.
 */
function describe(id: string): { tier: string; hint: string } {
    const preview = id.includes("preview") ? " · preview" : ""
    const floating = id.endsWith("-latest") ? " · floating alias" : ""
    const suffix = preview + floating

    // flash-lite must be tested before flash.
    if (id.includes("flash-lite"))
        return { tier: "Lite", hint: "Fastest, cheapest" + suffix }
    if (id.includes("pro"))
        return { tier: "Pro", hint: "Most capable, slowest" + suffix }
    if (id.includes("flash"))
        return { tier: "Flash", hint: "Balanced" + suffix }
    return { tier: "", hint: suffix.replace(/^ · /, "") }
}

const CACHE_TTL_MS = 60 * 60 * 1000
let cache: { at: number; models: VideoModel[] } | undefined

/**
 * Not a hardcoded list — the account's real catalogue, filtered to models
 * that can actually do what this app needs:
 *
 *  - createCachedContent: the whole cost model rests on caching the video
 *    across turns. Requiring it also drops TTS, image, live and embedding
 *    variants for free, since none of them support it.
 *  - >= 1M input tokens: an hour of video is ~360k tokens at low resolution.
 *  - not 2.0: deprecated, and implicit caching starts at 2.5.
 */
function isVideoCapable(m: {
    name?: string
    supportedActions?: string[]
    inputTokenLimit?: number
}): boolean {
    const name = m.name ?? ""
    const actions = m.supportedActions ?? []
    return (
        name.startsWith("models/gemini-") &&
        !name.startsWith("models/gemini-2.0-") &&
        actions.includes("generateContent") &&
        actions.includes("createCachedContent") &&
        (m.inputTokenLimit ?? 0) >= 1_000_000 &&
        !/-(image|tts|live|audio)\b|robotics|computer-use|customtools/.test(name)
    )
}

export async function listVideoModels(): Promise<VideoModel[]> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.models

    try {
        const found: VideoModel[] = []
        for await (const m of await ai().models.list()) {
            if (!isVideoCapable(m)) continue
            const id = (m.name ?? "").replace(/^models\//, "")
            found.push({ id, label: m.displayName || id, ...describe(id) })
        }

        // Pinned versions first, newest generation first; floating "-latest"
        // aliases last, since they can change model under a saved chat.
        found.sort((a, b) => {
            const alias = (s: string) => (s.endsWith("-latest") ? 1 : 0)
            return (
                alias(a.id) - alias(b.id) ||
                b.id.localeCompare(a.id, undefined, { numeric: true })
            )
        })

        if (found.length) {
            cache = { at: Date.now(), models: found }
            return found
        }
    } catch (error) {
        console.error("could not list Gemini models:", error)
    }

    // Never leave the picker empty — fall back to the configured default.
    const fallback = Env.geminiModel
    return [{ id: fallback, label: fallback, ...describe(fallback) }]
}

/** Never trust a model id off the wire. */
export async function isAllowedModel(id: string): Promise<boolean> {
    return (await listVideoModels()).some((m) => m.id === id)
}
