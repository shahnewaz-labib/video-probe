import { modelType } from "@/components/app-context"
import { Env } from "@/config/env"
import { prismaClient } from "@/config/prisma"
import { auth } from "@clerk/nextjs"
import { revalidatePath } from "next/cache"
import { NextRequest } from "next/server"

import { redis } from "@/config/redis"
import { Ratelimit } from "@upstash/ratelimit"

export const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(15, "1 m")
})

export async function POST(request: NextRequest) {
    const { userId } = auth()
    if (!userId) return Response.json({}, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const model: modelType =
        (searchParams.get("model") as modelType) || "gpt-3.5-turbo"

    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
        return Response.json({ success: false })
    }

    const formData = new FormData()
    formData.append("file", file)

    let apiPath = "query/audio"
    if (model === "gpt-4-vision-preview") {
        apiPath = "query/video"
    }

    try {
        const response = await fetch(`${Env.backendUrl}/${apiPath}`, {
            method: "POST",
            body: formData,
            headers: {
                "x-api-key": Env.backendApiKey
            }
        })

        const responseJson = await response.json()

        if (response.ok) {
            const chat = await prismaClient.chat.create({
                data: {
                    userId,
                    model,
                    messages: responseJson.messages
                }
            })

            revalidatePath("/")

            return Response.json({
                success: true,
                chat
            })
        } else {
            return Response.json({
                success: false
            })
        }
    } catch (error) {
        console.error("/api/upload:::", error)
        return Response.json({
            success: false
        })
    }
}
