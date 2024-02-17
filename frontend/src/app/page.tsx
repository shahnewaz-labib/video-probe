"use client"

import FileUpload from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormEvent, useState } from "react"

export default function Home() {
    const [isFileUploaded, setIsFileUploaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [response, setResponse] = useState("")
    const [prompt, setPrompt] = useState("")

    const onFileSubmit = async (file: File) => {
        if (!file) return
        setIsFileUploaded(true)

        try {
            const data = new FormData()
            data.set("file", file)

            setIsLoading(true)
            let res: any = await fetch("/api/upload", {
                method: "POST",
                body: data,
            })
            setIsLoading(false)

            if (!res.ok) throw new Error(await res.text())

            res = await res.json()
            console.log("res", res)
            setResponse(res.message)
        } catch (e: any) {
            setIsFileUploaded(false)
            console.error(e)
        }
    }

    const onPrompt = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log("Sending prompt", prompt)
        setPrompt("")
    }

    return (
        <div className="px-32 py-8 flex flex-col gap-y-8">
            {!isFileUploaded ? (
                <div>
                    <FileUpload
                        className="flex flex-col gap-y-4"
                        onFileSubmit={onFileSubmit}
                    />
                </div>
            ) : (
                <div>
                    {isLoading ? (
                        <p className="animate-pulse">Generating Response</p>
                    ) : (
                        <p>{response}</p>
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
