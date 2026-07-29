import { SquarePen } from "lucide-react"
import Link from "next/link"
import React from "react"

import { getChats } from "@/actions/chat"
import { ChatRow } from "@/components/chat-row"
import { cn } from "@/lib/utils"

type Chat = Awaited<ReturnType<typeof getChats>>[number]

/** Coarse buckets — precise dates aren't useful for finding a recent chat. */
function bucket(date: Date): string {
    const day = 86_400_000
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const age = startOfToday.getTime() - date.getTime()

    if (age <= 0) return "Today"
    if (age <= day) return "Yesterday"
    if (age <= 7 * day) return "Previous 7 days"
    if (age <= 30 * day) return "Previous 30 days"
    return "Older"
}

const ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"]

export const SideBar = async (props: React.HTMLAttributes<HTMLDivElement>) => {
    const chats = await getChats()

    const groups = new Map<string, Chat[]>()
    for (const chat of chats) {
        const key = bucket(chat.createdAt)
        groups.set(key, [...(groups.get(key) ?? []), chat])
    }

    return (
        <div
            {...props}
            className={cn("flex flex-col overflow-hidden", props.className)}
        >
            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                <p className="font-semibold">Video Probe</p>
                <Link
                    href="/"
                    aria-label="New chat"
                    title="New chat"
                    className="hover:bg-accent ml-auto rounded-md p-1.5"
                >
                    <SquarePen className="size-4" />
                </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                {chats.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                        No videos yet. Upload one to get started.
                    </p>
                ) : (
                    ORDER.filter((k) => groups.has(k)).map((key) => (
                        <div key={key} className="mb-4">
                            <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                                {key}
                            </p>
                            <div className="flex flex-col gap-0.5">
                                {groups.get(key)!.map((chat) => (
                                    <ChatRow
                                        key={chat.id}
                                        id={chat.id}
                                        name={chat.name}
                                        displayName={chat.displayName}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
