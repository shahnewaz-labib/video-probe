"use client"

import { AppContext } from "@/components/app-context"
import FileUpload from "@/components/file-upload"
import { ModelSelection } from "@/components/model-switcher"
import { useRouter } from "next/navigation"
import { useContext, useState } from "react"

export default function Home() {
    const [isLoading, setIsLoading] = useState(false)
    const { selectedModel } = useContext(AppContext)
    const router = useRouter()

    const onFileSubmit = async (file: File) => {
        if (!file) return

        try {
            const data = new FormData()
            data.set("file", file)

            setIsLoading(true)

            let res: any = await fetch(`/api/upload?model=${selectedModel}`, {
                method: "POST",
                body: data
            })

            if (!res.ok) throw new Error(await res.text())

            res = await res.json()
            const chat = res.chat
            console.log("res got", res)

            if (chat) {
                router.push(`/chat/${chat.id}`)
            }
        } catch (e: any) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-y-8 py-8">
            <div className="ml-auto">
                <ModelSelection />
            </div>
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
