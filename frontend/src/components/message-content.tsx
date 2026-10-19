"use client"

import {
    Children,
    createContext,
    isValidElement,
    useContext,
    type ReactNode
} from "react"
import { Streamdown } from "streamdown"

import { firstTimestamp, parseTimestamp, TIMESTAMP } from "@/lib/timestamps"

/**
 * True inside a list item or quote. A "loose" markdown list wraps each item
 * in a <p>, and a margin label there would sit against the indent, on top
 * of the bullet, so nested paragraphs keep inline links only.
 */
const Nested = createContext(false)

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
                    className="text-primary cursor-pointer font-mono text-[0.8em] tabular-nums underline-offset-2 hover:underline"
                >
                    {label}
                </button>
            )
            last = at + label.length
        }
        if (last < node.length) out.push(node.slice(last))
        return out
    }

    if (Array.isArray(node))
        return Children.map(node, (c) => linkify(c, onSeek))
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
                  <MarginParagraph onSeek={onSeek}>{children}</MarginParagraph>
              ),
              li: ({ children }: { children?: ReactNode }) => (
                  <Nested value={true}>
                      <li>{linkify(children, onSeek)}</li>
                  </Nested>
              ),
              blockquote: ({ children }: { children?: ReactNode }) => (
                  <Nested value={true}>
                      <blockquote>{children}</blockquote>
                  </Nested>
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
            className="prose prose-neutral dark:prose-invert prose-p:my-3 prose-p:leading-[1.6] prose-ul:my-3 prose-li:my-1 prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-serif prose-pre:my-3 max-w-none font-serif text-[18px] break-words sm:pl-20"
        >
            {content}
        </Streamdown>
    )
}

/**
 * A paragraph with its first cited moment in a left margin, so a reader
 * can scan answers by time. Inline timestamps stay clickable too. The
 * margin is hidden on narrow screens, where it would squeeze the text.
 */
function MarginParagraph({
    children,
    onSeek
}: {
    children?: ReactNode
    onSeek: (seconds: number) => void
}) {
    if (useContext(Nested)) return <p>{linkify(children, onSeek)}</p>
    const label = firstTimestamp(children)

    return (
        // Absolutely placed rather than a grid column, so paragraph margins
        // still collapse and lists/headings line up with the text.
        <div className="relative">
            {label && (
                <button
                    type="button"
                    onClick={() => onSeek(parseTimestamp(label))}
                    aria-label={`Jump to ${label}`}
                    className="text-primary absolute top-1.5 -left-20 hidden w-16 cursor-pointer text-left font-mono text-xs tabular-nums hover:underline sm:block"
                >
                    {label}
                </button>
            )}
            <p>{linkify(children, onSeek)}</p>
        </div>
    )
}
