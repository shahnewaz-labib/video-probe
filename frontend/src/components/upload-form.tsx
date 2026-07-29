"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { ThinkingOrb } from "@/components/orb"

import FileUpload from "@/components/file-upload"
import { ModelSelector } from "@/components/model-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { VideoModel } from "@/lib/models"
import { parseYouTubeId } from "@/lib/youtube"

type Phase = "idle" | "uploading" | "processing" | "linking"

export default function UploadForm({
    models,
    defaultModel
}: {
    models: VideoModel[]
    defaultModel: string
}) {
    const [model, setModel] = useState(defaultModel)
    const [phase, setPhase] = useState<Phase>("idle")
    const [percent, setPercent] = useState(0)
    const [url, setUrl] = useState("")
    const router = useRouter()

    const busy = phase !== "idle"
    const urlIsValid = parseYouTubeId(url) !== null

    const onUrlSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!urlIsValid || busy) return

        setPhase("linking")
        try {
            const res = await fetch("/api/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, model })
            })
            const json = await res
                .json()
                .catch(() => ({ message: "Unexpected server response." }))

            if (!res.ok || !json.chatId) {
                setPhase("idle")
                toast.error(json.message ?? "Could not add that video.")
                return
            }
            router.push(`/chat/${json.chatId}`)
        } catch {
            setPhase("idle")
            toast.error("Could not reach the server. Try again.")
        }
    }

    const onFileSubmit = (file: File) => {
        if (!file) return

        setPhase("uploading")
        setPercent(0)

        const data = new FormData()
        data.set("file", file)
        data.set("model", model)

        // XHR rather than fetch: fetch cannot report request upload progress,
        // and a multi-hundred-MB upload with an indeterminate spinner is
        // indistinguishable from a hang.
        const xhr = new XMLHttpRequest()
        xhr.open("POST", "/api/upload")

        xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return
            const pct = Math.round((e.loaded / e.total) * 100)
            setPercent(pct)
            // Bytes are all sent; the server is now waiting on Gemini.
            if (pct >= 100) setPhase("processing")
        }

        xhr.onload = () => {
            let json: { chatId?: string; message?: string } = {}
            try {
                json = JSON.parse(xhr.responseText)
            } catch {
                json = { message: "Unexpected server response." }
            }

            if (xhr.status >= 200 && xhr.status < 300 && json.chatId) {
                router.push(`/chat/${json.chatId}`)
                return
            }
            setPhase("idle")
            toast.error(json.message ?? "Upload failed.")
        }

        xhr.onerror = () => {
            setPhase("idle")
            toast.error("Upload failed. Check your connection and try again.")
        }

        xhr.send(data)
    }

    return (
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-y-8 py-10">
            <div className="flex items-center">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Probe a video
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Ask about anything said or shown. Answers cite the
                        moment.
                    </p>
                </div>
                <div className="ml-auto">
                    <ModelSelector
                        models={models}
                        value={model}
                        onChange={setModel}
                        disabled={busy}
                    />
                </div>
            </div>

            <form onSubmit={onUrlSubmit} className="flex gap-2">
                <Input
                    type="url"
                    inputMode="url"
                    value={url}
                    disabled={busy}
                    placeholder="Paste a YouTube link…"
                    onChange={(e) => setUrl(e.currentTarget.value)}
                />
                <Button
                    type="submit"
                    variant="secondary"
                    disabled={!urlIsValid || busy}
                >
                    {phase === "linking" ? "Adding…" : "Add"}
                </Button>
            </form>
            <p className="text-muted-foreground -mt-4 text-xs">
                Public videos only. Nothing is downloaded — Gemini reads the
                link directly, so there’s no upload and no 48-hour expiry.
                Long videos cost more, since the video is re-billed on every
                question.
            </p>

            <div className="flex items-center gap-3">
                <span className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs">or</span>
                <span className="bg-border h-px flex-1" />
            </div>

            <FileUpload
                className="flex flex-col gap-y-4"
                onFileSubmit={onFileSubmit}
                disabled={busy}
            />

            {busy && (
                <div className="flex flex-col items-center gap-3 pt-2">
                    <ThinkingOrb
                        state={phase === "uploading" ? "shaping" : "searching"}
                        size={64}
                        px={44}
                        aria-label="Preparing your video"
                    />
                    {phase === "uploading" && (
                        <div className="bg-muted h-1.5 w-56 overflow-hidden rounded-full">
                            <div
                                className="bg-primary h-full transition-[width] duration-200"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    )}
                    <p className="text-muted-foreground text-center text-sm">
                        {phase === "uploading"
                            ? `Uploading… ${percent}%`
                            : phase === "linking"
                              ? "Fetching video details…"
                              : "Gemini is watching the video — this can take a few minutes for long ones."}
                    </p>
                </div>
            )}
        </div>
    )
}
