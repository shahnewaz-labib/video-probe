"use client"

import { getChat } from "@/actions/chat"
import { complete } from "@/actions/completion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormEvent, useEffect, useState } from "react"
import { modelType } from "./app-context"

export default function ChatComponent({ chatId }: { chatId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [prompt, setPrompt] = useState("")
    const [messages, setMessages] = useState<any>()
    const [model, setModel] = useState<modelType>()

    useEffect(() => {
        getChat(chatId).then((chat) => {
            if (chat) {
                setMessages(chat.messages)
                //@ts-ignore
                setModel(chat.model)
            }
        })
    }, [])

    const onPrompt = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setPrompt("")

        const promptEntry = {
            role: "user",
            content: prompt
        }
        setMessages([...messages, promptEntry])
        messages.push(promptEntry)
        setIsLoading(true)
        let data = await fetch("/api/completion", {
            method: "POST",
            body: JSON.stringify({
                chatId,
                messages,
                model
            })
        })
        data = await data.json()
        setMessages(data)
        setIsLoading(false)
    }

    return (
        <div className="flex flex-col gap-y-8 py-8">
            <div className="flex flex-col">
                {messages && (
                    <div className="flex flex-col gap-y-3">
                        {messages?.slice(2).map((message: any) => {
                            return (
                                <div className="grid-cols-12 border-b-4 border-b-primary-foreground md:grid">
                                    <p className="col-span-1">
                                        {message.role}:
                                    </p>
                                    <p className="col-span-11">
                                        {message.content}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                )}
                {isLoading && (
                    <p className="mx-auto mt-4 animate-pulse">
                        Generating Response
                    </p>
                )}
            </div>
            <form onSubmit={onPrompt} className="flex gap-4">
                <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.currentTarget.value)}
                />
                <Button type="submit" disabled={isLoading}>
                    Send
                </Button>
            </form>
        </div>
    )
}
