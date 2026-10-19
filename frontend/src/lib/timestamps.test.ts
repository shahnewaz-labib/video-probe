import { expect, test } from "bun:test"
import { createElement } from "react"

import { firstTimestamp, parseTimestamp } from "./timestamps"

test("finds the first timestamp in plain text", () => {
    expect(firstTimestamp("at 03:12 and 12:04")).toBe("03:12")
})

test("ignores a half-streamed timestamp", () => {
    expect(firstTimestamp("starts at 12:0")).toBeNull()
})

test("looks inside nested elements in order", () => {
    const node = [
        "intro ",
        createElement("strong", null, "at 1:02:33"),
        " then 05:00"
    ]
    expect(firstTimestamp(node)).toBe("1:02:33")
})

test("returns null when there is none", () => {
    expect(
        firstTimestamp(["no", createElement("em", null, "times")])
    ).toBeNull()
})

test("parseTimestamp still handles both forms", () => {
    expect(parseTimestamp("01:15")).toBe(75)
    expect(parseTimestamp("1:02:33")).toBe(3753)
})
