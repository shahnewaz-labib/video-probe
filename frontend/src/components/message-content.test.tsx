import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { MessageContent } from "./message-content"

const render = (content: string) =>
    renderToStaticMarkup(<MessageContent content={content} onSeek={() => {}} />)

const marginLabels = (html: string) =>
    html.match(/aria-label="Jump to [^"]+"/g) ?? []

test("a top-level paragraph gets a margin label", () => {
    expect(marginLabels(render("Introduced at 03:12 here."))).toEqual([
        'aria-label="Jump to 03:12"'
    ])
})

test("paragraphs inside a loose list get no margin label", () => {
    const html = render("- intro at 00:12\n\n- demo at 01:30")
    expect(marginLabels(html)).toEqual([])
    // inline links still render
    expect(html).toContain("01:30")
})

test("paragraphs inside a blockquote get no margin label", () => {
    expect(marginLabels(render("> quoted at 05:00"))).toEqual([])
})
