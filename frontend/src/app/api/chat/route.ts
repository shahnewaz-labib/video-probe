import { prismaClient } from "@/config/prisma"
import { auth } from "@clerk/nextjs"
import { revalidatePath } from "next/cache"

import { redis } from "@/config/redis"
import { Ratelimit } from "@upstash/ratelimit"

export const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(25, "1 m")
})

export async function POST(req: Request) {
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

    const data = await req.json()

    const chat = await prismaClient.chat.create({
        data: {
            userId,
            model: data.model,
            messages: data.messages
        }
    })

    revalidatePath("/")

    return Response.json(chat)
}
