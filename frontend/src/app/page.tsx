"use client"

import { createChat } from "@/actions/chat"
import ChatComponent from "@/components/chat"
import FileUpload from "@/components/file-upload"
import { useState } from "react"

export default function Home() {
    const [chatId, setChatId] = useState<string | false>(false)
    const [isLoading, setIsLoading] = useState(false)

    const onFileSubmit = async (file: File) => {
        if (!file) return

        try {
            const data = new FormData()
            data.set("file", file)

            setIsLoading(true)

            let res: any = await fetch("/api/upload", {
                method: "POST",
                body: data
            })

            if (!res.ok) throw new Error(await res.text())

            res = await res.json()

            const chat = await createChat(res.messages)
            if (chat) {
                setChatId(chat.id)
            }
        } catch (e: any) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    if (chatId) {
        return <ChatComponent chatId={chatId} />
    }

    return (
        <div className="flex flex-col gap-y-8 py-8">
            <div className="flex flex-col">
                <FileUpload
                    className="flex flex-col gap-y-4"
                    onFileSubmit={onFileSubmit}
                />
                {isLoading && <p className="mx-auto">Loading...</p>}
            </div>
        </div>
    )
}
