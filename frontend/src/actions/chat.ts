"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { ai } from "@/config/gemini"
import { prismaClient } from "@/config/prisma"
import { isAllowedModel } from "@/lib/models"
import { deleteVideo } from "@/lib/storage"

export const getChat = async (id: string) => {
    const { userId } = await auth()
    if (!userId) return null

    return prismaClient.chat.findUnique({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } }
    })
}

export const getChats = async () => {
    const { userId } = await auth()
    if (!userId) return []

    return prismaClient.chat.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
    })
}

/**
 * Interactions can switch model mid-conversation — previous_interaction_id
 * carries the history across. Applies from the next turn onward.
 */
export const setChatModel = async (chatId: string, model: string) => {
    const { userId } = await auth()
    if (!userId) return

    if (!(await isAllowedModel(model))) return

    await prismaClient.chat.updateMany({
        where: { id: chatId, userId },
        data: { model }
    })
    revalidatePath(`/chat/${chatId}`)
}

export const deleteChat = async (chatId: string) => {
    const { userId } = await auth()
    if (!userId) return

    const chat = await prismaClient.chat.findUnique({
        where: { id: chatId, userId }
    })
    if (!chat) return

    // YouTube chats own nothing: no Files API object, no local copy.
    if (chat.fileName) {
        // Best effort: the row is the source of truth, but leaving the upload
        // behind would hold project quota until it expires on its own.
        await ai()
            .files.delete({ name: chat.fileName })
            .catch((e) => console.error("files.delete failed:", e))
    }
    if (chat.source === "upload") await deleteVideo(chatId)

    // Messages cascade.
    await prismaClient.chat.delete({ where: { id: chatId, userId } })
    revalidatePath("/")
}
