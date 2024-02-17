"use client"

import ChatComponent from "@/components/chat"

export default function Chat({ params }: { params: { id: string } }) {
    return <ChatComponent chatId={params.id} />
}
