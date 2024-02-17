"use client"

import FileUpload from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormEvent, useState } from "react"
import { complete } from "./actions/completion"

export default function Home() {
    const [isFileUploaded, setIsFileUploaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [prompt, setPrompt] = useState("")
    const [messages, setMessages] = useState<any>()

    const onFileSubmit = async (file: File) => {
        if (!file) return
        setIsFileUploaded(true)

        try {
            const data = new FormData()
            data.set("file", file)

            setIsLoading(true)
            let res: any = await fetch("/api/upload", {
                method: "POST",
                body: data
            })
            setIsLoading(false)

            if (!res.ok) throw new Error(await res.text())

            res = await res.json()
            setMessages(res.messages)
            console.log("response", res.messages)
        } catch (e: any) {
            setIsFileUploaded(false)
            console.error(e)
        }
    }

    const onPrompt = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const promptEntry = {
            role: "user",
            content: prompt
        }
        setMessages([...messages, promptEntry])
        messages.push(promptEntry)
        setIsLoading(true)
        const data = await complete(messages)
        setMessages(data)
        setIsLoading(false)
        setPrompt("")
    }

    return (
        <div className="flex flex-col gap-y-8 px-32 py-8">
            {!isFileUploaded ? (
                <div>
                    <FileUpload
                        className="flex flex-col gap-y-4"
                        onFileSubmit={onFileSubmit}
                    />
                </div>
            ) : (
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
            )}
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
