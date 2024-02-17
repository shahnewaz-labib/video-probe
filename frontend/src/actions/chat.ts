"use server"

import { modelType } from "@/components/app-context"
import { prismaClient } from "@/config/prisma"
import { auth } from "@clerk/nextjs"
import { Chat } from "@prisma/client"
import { revalidatePath } from "next/cache"

export const createChat = async (
    messages: any,
    model: modelType
): Promise<Chat | false> => {
    const { userId } = auth()
    if (!userId) return false

    const chat = await prismaClient.chat.create({
        data: {
            userId,
            model,
            messages
        }
    })

    revalidatePath("/")

    return chat
}

export const updateChatHistory = async (chatId: string, messages: any) => {
    const chat = await prismaClient.chat.findUnique({ where: { id: chatId } })
    if (!chat) return
    await prismaClient.chat.update({
        where: { id: chatId },
        data: {
            messages: [...chat.messages, ...messages]
        }
    })
}

export const updateChatName = async (chatId: string, name: string) => {
    await prismaClient.chat.update({
        where: { id: chatId },
        data: { name: name }
    })
}

export const deleteChat = async (chatId: string) => {
    const { userId } = auth()
    if (!userId) return
    await prismaClient.chat.delete({ where: { id: chatId, userId } })
    revalidatePath("/")
}

export const getChat = async (id: string) => {
    const { userId } = auth()
    if (!userId) return false
    return await prismaClient.chat.findUnique({ where: { id, userId } })
}

export const getChats = async () => {
    const { userId } = auth()
    if (!userId) return false
    return await prismaClient.chat.findMany({ where: { userId } })
}
