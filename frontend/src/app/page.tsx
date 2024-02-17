"use client"

import FileUpload from "@/components/file-upload"
import { useState } from "react"

export default function Home() {
    const [isFileUploaded, setIsFileUploaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const onFileSubmit = async (file: File) => {
        if (!file) return

        try {
            const data = new FormData()
            data.set("file", file)

            setIsLoading(true)
            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            })
            setIsLoading(false)

            if (!res.ok) throw new Error(await res.text())
            setIsFileUploaded(true)
        } catch (e: any) {
            console.error(e)
        }
    }

    return (
        <div className="px-32 py-8">
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
                        <p>summary</p>
                    )}
                </div>
            )}
        </div>
    )
}
