import { Redis } from "@upstash/redis"
import { Env } from "./env"

export const redis = new Redis({
    url: Env.upstashUrl,
    token: Env.upstashKey
})
