"use client"

import { deleteChat } from "@/actions/chat"
import { Trash2 } from "lucide-react"

export const DeleteChatButton = async ({ chatId }: { chatId: string }) => {
    const onClick = async () => {
        await deleteChat(chatId)
    }
    return (
        <button onClick={onClick} className="ml-auto pr-4">
            <Trash2 />
        </button>
    )
}
