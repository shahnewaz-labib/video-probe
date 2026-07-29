import { expect, test } from "bun:test"

import { parseRange } from "./range"

const SIZE = 1000

test("no header means send the whole file", () => {
    expect(parseRange(null, SIZE)).toEqual({ kind: "full" })
})

test("explicit range", () => {
    expect(parseRange("bytes=0-499", SIZE)).toEqual({
        kind: "partial",
        start: 0,
        end: 499
    })
})

test("open-ended range runs to the last byte", () => {
    // What a browser sends first when it starts playing.
    expect(parseRange("bytes=500-", SIZE)).toEqual({
        kind: "partial",
        start: 500,
        end: 999
    })
})

test("suffix range means the LAST n bytes", () => {
    // Easy to mis-read as 0..500; getting this wrong breaks seeking to the
    // end of a video, since players fetch the trailing moov atom this way.
    expect(parseRange("bytes=-500", SIZE)).toEqual({
        kind: "partial",
        start: 500,
        end: 999
    })
})

test("suffix larger than the file clamps to the whole file", () => {
    expect(parseRange("bytes=-5000", SIZE)).toEqual({
        kind: "partial",
        start: 0,
        end: 999
    })
})

test("end beyond EOF is clamped, not rejected", () => {
    expect(parseRange("bytes=900-5000", SIZE)).toEqual({
        kind: "partial",
        start: 900,
        end: 999
    })
})

test("unsatisfiable and malformed cases", () => {
    expect(parseRange("bytes=1000-", SIZE).kind).toBe("unsatisfiable")
    expect(parseRange("bytes=600-500", SIZE).kind).toBe("unsatisfiable")
    expect(parseRange("bytes=-0", SIZE).kind).toBe("unsatisfiable")
    expect(parseRange("bytes=-", SIZE).kind).toBe("unsatisfiable")
    expect(parseRange("items=0-99", SIZE).kind).toBe("unsatisfiable")
    expect(parseRange("bytes=0-99,200-299", SIZE).kind).toBe("unsatisfiable")
})
