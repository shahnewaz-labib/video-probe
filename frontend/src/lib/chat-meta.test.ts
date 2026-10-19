import { expect, test } from "bun:test"

import { chatMeta } from "./chat-meta"

const now = new Date("2026-10-19T12:00:00Z")

test("youtube links never expire", () => {
    expect(chatMeta("youtube", null, now)).toBe("YouTube")
})

test("uploads show hours left", () => {
    expect(chatMeta("upload", new Date("2026-10-20T19:30:00Z"), now)).toBe(
        "Upload · 31h left"
    )
})

test("uploads show minutes left under an hour", () => {
    expect(chatMeta("upload", new Date("2026-10-19T12:40:00Z"), now)).toBe(
        "Upload · 40m left"
    )
})

test("expired uploads say so", () => {
    expect(chatMeta("upload", new Date("2026-10-19T11:00:00Z"), now)).toBe(
        "Upload · expired"
    )
})
