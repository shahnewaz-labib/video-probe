import { getChats } from "@/actions/chat"
import { cn } from "@/lib/utils"
import { SquarePen } from "lucide-react"
import Link from "next/link"
import React from "react"
import { DeleteChatButton } from "./delete-chat-button"

export const SideBar = async (props: React.HTMLAttributes<HTMLDivElement>) => {
    const chats = await getChats()

    return (
        <div {...props} className={cn("pl-4 pt-4", props.className)}>
            <div className="flex">
                <p className="text-xl font-bold">Video Chat</p>
                <div className="ml-auto pr-4">
                    <Link href="/">
                        <SquarePen />
                    </Link>
                </div>
            </div>
            <div className="flex flex-col gap-4 pt-4">
                {!!chats &&
                    chats.map((chat) => {
                        return (
                            <div className="flex">
                                <Link href={`/chat/${chat.id}`}>
                                    {chat.name}
                                </Link>
                                <DeleteChatButton chatId={chat.id} />
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
