"use client"

import { Children, isValidElement, type ReactNode } from "react"
import { Streamdown } from "streamdown"

/** 0:07, 01:15, or 1:02:33 */
const TIMESTAMP = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g

export function parseTimestamp(label: string): number {
    const p = label.split(":").map(Number)
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
}

/**
 * Rewrites MM:SS into seek buttons. Applied per rendered element via
 * Streamdown's `components` map rather than to the raw markdown string —
 * touching the string would corrupt half-written syntax mid-stream, and
 * code spans are left alone because they aren't overridden.
 */
function linkify(node: ReactNode, onSeek: (s: number) => void): ReactNode {
    if (typeof node === "string") {
        TIMESTAMP.lastIndex = 0
        if (!TIMESTAMP.test(node)) return node
        TIMESTAMP.lastIndex = 0

        const out: ReactNode[] = []
        let last = 0
        for (const m of node.matchAll(TIMESTAMP)) {
            const at = m.index!
            if (at > last) out.push(node.slice(last, at))
            const label = m[1]
            out.push(
                <button
                    key={`${at}-${label}`}
                    type="button"
                    onClick={() => onSeek(parseTimestamp(label))}
                    title={`Jump to ${label}`}
                    className="text-primary bg-primary/10 hover:bg-primary/20 mx-0.5 cursor-pointer rounded px-1 font-mono text-[0.9em] tabular-nums underline-offset-2 hover:underline"
                >
                    {label}
                </button>
            )
            last = at + label.length
        }
        if (last < node.length) out.push(node.slice(last))
        return out
    }

    if (Array.isArray(node)) return Children.map(node, (c) => linkify(c, onSeek))
    if (isValidElement(node)) return node
    return node
}

export function MessageContent({
    content,
    isStreaming,
    onSeek
}: {
    content: string
    isStreaming?: boolean
    onSeek?: (seconds: number) => void
}) {
    // Only elements that realistically carry prose get rewritten; anything
    // not listed here renders with Streamdown's defaults.
    const components = onSeek
        ? {
              p: ({ children }: { children?: ReactNode }) => (
                  <p>{linkify(children, onSeek)}</p>
              ),
              li: ({ children }: { children?: ReactNode }) => (
                  <li>{linkify(children, onSeek)}</li>
              ),
              strong: ({ children }: { children?: ReactNode }) => (
                  <strong>{linkify(children, onSeek)}</strong>
              ),
              em: ({ children }: { children?: ReactNode }) => (
                  <em>{linkify(children, onSeek)}</em>
              ),
              td: ({ children }: { children?: ReactNode }) => (
                  <td>{linkify(children, onSeek)}</td>
              )
          }
        : undefined

    return (
        <Streamdown
            parseIncompleteMarkdown
            mode={isStreaming ? "streaming" : "static"}
            caret={isStreaming ? "block" : undefined}
            components={components}
            className="prose prose-neutral dark:prose-invert prose-p:my-3 prose-p:leading-relaxed prose-ul:my-3 prose-li:my-1 prose-headings:mt-6 prose-headings:mb-3 prose-pre:my-3 max-w-none text-[15px] break-words"
        >
            {content}
        </Streamdown>
    )
}
