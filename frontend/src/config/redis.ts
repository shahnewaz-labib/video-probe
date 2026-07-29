import { Redis } from "@upstash/redis"
import { Env } from "./env"

let client: Redis | undefined

/** Lazy so importing this module doesn't require Upstash creds at build time. */
export function redis(): Redis {
    return (client ??= new Redis({
        url: Env.upstashUrl,
        token: Env.upstashKey
    }))
}
