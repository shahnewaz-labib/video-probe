export type RangeResult =
    | { kind: "full" }
    | { kind: "partial"; start: number; end: number }
    | { kind: "unsatisfiable" }

/**
 * Parses a single-range HTTP Range header against a known file size.
 *
 * Browsers will happily play a video served without 206 support but will
 * refuse to scrub it, so this has to be right for timestamp seeking to work.
 * Multi-range ("bytes=0-99,200-299") is deliberately unsupported — media
 * elements don't use it, and honouring it would mean multipart/byteranges.
 */
export function parseRange(header: string | null, size: number): RangeResult {
    if (!header) return { kind: "full" }

    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
    if (!match) return { kind: "unsatisfiable" }

    const [, rawStart, rawEnd] = match
    if (rawStart === "" && rawEnd === "") return { kind: "unsatisfiable" }

    let start: number
    let end: number

    if (rawStart === "") {
        // Suffix form: "bytes=-500" means the LAST 500 bytes, not 0..500.
        const suffix = Number(rawEnd)
        if (suffix <= 0) return { kind: "unsatisfiable" }
        start = Math.max(0, size - suffix)
        end = size - 1
    } else {
        start = Number(rawStart)
        end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1)
    }

    if (!Number.isFinite(start) || !Number.isFinite(end))
        return { kind: "unsatisfiable" }
    if (start > end || start >= size) return { kind: "unsatisfiable" }

    return { kind: "partial", start, end }
}
