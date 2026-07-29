/**
 * The Files API and the Interactions API disagree about MIME types: an upload
 * of `video/quicktime` succeeds, then the content part is rejected with
 * "not supported for 'input[0].mime_type'". Inference is the stricter of the
 * two, so normalise to its vocabulary everywhere.
 *
 * Authoritative list, from the 400 the API returns:
 *   video/mp4, video/mpeg, video/mpg, video/mov, video/avi,
 *   video/x-flv, video/webm, video/wmv, video/3gpp, video/vnd.youtube.yt
 *
 * Note the absentee: Matroska (.mkv) is not supported at inference at all,
 * so it must be rejected at upload rather than failing on the first turn.
 */
const BROWSER_TO_GEMINI: Record<string, string> = {
    "video/mp4": "video/mp4",
    "video/mpeg": "video/mpeg",
    "video/mpg": "video/mpg",
    "video/mov": "video/mov",
    "video/quicktime": "video/mov", // browsers report .mov as quicktime
    "video/avi": "video/avi",
    "video/x-msvideo": "video/avi",
    "video/msvideo": "video/avi",
    "video/x-flv": "video/x-flv",
    "video/webm": "video/webm",
    "video/wmv": "video/wmv",
    "video/x-ms-wmv": "video/wmv",
    "video/3gpp": "video/3gpp"
}

/** Returns the inference-safe MIME type, or null if Gemini can't read it. */
export function toGeminiVideoMime(mimeType: string): string | null {
    return BROWSER_TO_GEMINI[mimeType.toLowerCase()] ?? null
}

/** For the file picker's `accept` map and user-facing copy. */
export const ACCEPTED_EXTENSIONS = [
    ".mp4",
    ".mov",
    ".webm",
    ".mpeg",
    ".mpg",
    ".avi",
    ".flv",
    ".wmv",
    ".3gp"
]
