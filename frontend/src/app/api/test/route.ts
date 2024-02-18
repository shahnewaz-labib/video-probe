import { redis } from "@/config/redis"
import { auth } from "@clerk/nextjs"
import { Ratelimit } from "@upstash/ratelimit"

export const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(5, "1 m")
})

export async function GET() {
    const { userId } = auth()
    if (!userId)
        return Response.json({ message: "Not allowed" }, { status: 429 })
    const { success } = await ratelimit.limit(userId)
    if (!success) {
        return Response.json(
            { message: "Rate limit exceeded" },
            { status: 429 }
        )
    }
    return Response.json({ message: "OK" })
}
