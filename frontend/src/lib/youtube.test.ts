import { expect, test } from "bun:test"

import { canonicalYouTubeUrl, parseYouTubeId } from "./youtube"

const ID = "jNQXAC9IVRw"

test("accepts the forms people actually paste", () => {
    for (const url of [
        `https://www.youtube.com/watch?v=${ID}`,
        `https://youtube.com/watch?v=${ID}`,
        `https://m.youtube.com/watch?v=${ID}`,
        `https://youtu.be/${ID}`,
        `https://www.youtube.com/shorts/${ID}`,
        `https://www.youtube.com/live/${ID}`,
        `https://www.youtube.com/embed/${ID}`,
        // extra params (timestamps, playlists, tracking) must not break it
        `https://www.youtube.com/watch?v=${ID}&t=42s&list=PLabc`,
        `  https://youtu.be/${ID}?si=xyz  `
    ]) {
        expect(parseYouTubeId(url)).toBe(ID)
    }
})

test("rejects non-YouTube and malformed input", () => {
    for (const url of [
        "https://vimeo.com/12345",
        // lookalike host — must not be treated as YouTube
        "https://youtube.com.evil.test/watch?v=" + ID,
        "https://www.youtube.com/watch?v=tooshort",
        "https://www.youtube.com/",
        "https://www.youtube.com/@somechannel",
        "not a url",
        ""
    ]) {
        expect(parseYouTubeId(url)).toBeNull()
    }
})

test("canonicalises so one video is one URL", () => {
    expect(canonicalYouTubeUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
    expect(parseYouTubeId(`https://youtu.be/${ID}?si=xyz`)).toBe(
        parseYouTubeId(`https://www.youtube.com/watch?v=${ID}&t=9s`)
    )
})
