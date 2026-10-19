import { isValidElement, type ReactNode } from "react"

/** 0:07, 01:15, or 1:02:33 */
export const TIMESTAMP = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g

export function parseTimestamp(label: string): number {
    const p = label.split(":").map(Number)
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
}

/**
 * The first complete timestamp in a rendered subtree, in reading order.
 * A half-streamed "12:0" doesn't match, so the margin never shows a
 * label that's still being written.
 */
export function firstTimestamp(node: ReactNode): string | null {
    if (typeof node === "string") {
        TIMESTAMP.lastIndex = 0
        const m = TIMESTAMP.exec(node)
        TIMESTAMP.lastIndex = 0
        return m ? m[1] : null
    }
    if (Array.isArray(node)) {
        for (const child of node) {
            const found = firstTimestamp(child)
            if (found) return found
        }
        return null
    }
    if (isValidElement<{ children?: ReactNode }>(node))
        return firstTimestamp(node.props.children)
    return null
}
