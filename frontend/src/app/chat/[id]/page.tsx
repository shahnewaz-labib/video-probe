import { notFound } from "next/navigation"

import { getChat } from "@/actions/chat"
import ChatComponent from "@/components/chat"
import { listVideoModels } from "@/lib/models"

export default async function Chat({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const [chat, models] = await Promise.all([getChat(id), listVideoModels()])
    if (!chat) notFound()

    return (
        <ChatComponent
            chatId={chat.id}
            displayName={chat.displayName}
            model={chat.model}
            models={models}
            source={chat.source}
            fileUri={chat.fileUri}
            // Null expiry (YouTube) never goes read-only.
            isExpired={
                chat.fileExpiresAt ? chat.fileExpiresAt < new Date() : false
            }
            expiresAt={chat.fileExpiresAt?.toISOString() ?? null}
            initialMessages={chat.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                inputTokens: m.inputTokens,
                outputTokens: m.outputTokens
            }))}
        />
    )
}
