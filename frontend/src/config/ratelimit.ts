import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "@/config/redis"

export const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(15, "1 m")
})
