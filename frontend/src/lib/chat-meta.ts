/**
 * The one-line description under a chat's name in the sidebar. Rounds
 * down like ExpiryBadge in chat.tsx, so both agree on "31h left".
 */
export function chatMeta(
    source: string,
    expiresAt: Date | null,
    now: Date
): string {
    if (source === "youtube") return "YouTube"
    if (!expiresAt) return "Upload"

    const ms = expiresAt.getTime() - now.getTime()
    if (ms <= 0) return "Upload · expired"

    const hours = Math.floor(ms / 3_600_000)
    const minutes = Math.floor((ms % 3_600_000) / 60_000)
    return `Upload · ${hours > 0 ? `${hours}h` : `${minutes}m`} left`
}
