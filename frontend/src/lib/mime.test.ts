import { expect, test } from "bun:test"

import { toGeminiVideoMime } from "./mime"

test("normalises browser types Gemini rejects at inference", () => {
    // The bug this exists to prevent: browsers report .mov as quicktime, the
    // Files API accepts it, then the content part 400s asking for video/mov.
    expect(toGeminiVideoMime("video/quicktime")).toBe("video/mov")
    expect(toGeminiVideoMime("video/x-msvideo")).toBe("video/avi")
    expect(toGeminiVideoMime("video/x-ms-wmv")).toBe("video/wmv")
})

test("passes through types Gemini already accepts", () => {
    expect(toGeminiVideoMime("video/mp4")).toBe("video/mp4")
    expect(toGeminiVideoMime("video/webm")).toBe("video/webm")
})

test("is case insensitive", () => {
    expect(toGeminiVideoMime("VIDEO/QuickTime")).toBe("video/mov")
})

test("rejects formats Gemini cannot read", () => {
    // Matroska is absent from the supported list — must fail at upload,
    // not after a successful upload on the first turn.
    expect(toGeminiVideoMime("video/x-matroska")).toBeNull()
    expect(toGeminiVideoMime("application/pdf")).toBeNull()
    expect(toGeminiVideoMime("")).toBeNull()
})
