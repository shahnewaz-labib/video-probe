import { prismaClient } from "@/config/prisma"
import { auth } from "@clerk/nextjs"
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
    const { userId } = auth()
    if (!userId) return false

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
