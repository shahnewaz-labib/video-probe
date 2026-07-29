import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"

// Uploads are far more expensive than turns (a video costs a full
// uncached ingest), so they get a much tighter window.
let upload: Ratelimit | undefined
let chat: Ratelimit | undefined

export function uploadLimit(): Ratelimit {
    return (upload ??= new Ratelimit({
        redis: redis(),
        limiter: Ratelimit.fixedWindow(5, "10 m")
    }))
}

export function chatLimit(): Ratelimit {
    return (chat ??= new Ratelimit({
        redis: redis(),
        limiter: Ratelimit.fixedWindow(25, "1 m")
    }))
}
