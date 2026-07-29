"use client"

import { ChevronDown } from "lucide-react"
import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
    type Ref
} from "react"

import { cn } from "@/lib/utils"
import { parseYouTubeId } from "@/lib/youtube"

/** What the chat needs from either player. */
export type PlayerHandle = { seek: (seconds: number) => void }

/**
 * Collapsible, and capped well under half the viewport: a permanently
 * pinned player leaves so little room for the transcript that the chat
 * feels like a letterbox.
 */
export function VideoPlayer({
    ref,
    chatId,
    displayName,
    source,
    fileUri
}: {
    ref: Ref<PlayerHandle>
    chatId: string
    displayName: string
    source: string
    fileUri: string
}) {
    const [open, setOpen] = useState(true)

    return (
        <div className="space-y-1.5">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
                <ChevronDown
                    className={cn(
                        "size-3.5 transition-transform",
                        !open && "-rotate-90"
                    )}
                />
                {open ? "Hide video" : "Show video"}
            </button>

            <div className={cn(!open && "hidden")}>
                {source === "youtube" ? (
                    <YouTubePlayer ref={ref} url={fileUri} />
                ) : (
                    <UploadedPlayer
                        ref={ref}
                        chatId={chatId}
                        displayName={displayName}
                    />
                )}
            </div>
        </div>
    )
}

const UploadedPlayer = forwardRef<
    PlayerHandle,
    { chatId: string; displayName: string }
>(function UploadedPlayer({ chatId, displayName }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [failed, setFailed] = useState(false)

    useImperativeHandle(ref, () => ({
        seek(seconds) {
            const v = videoRef.current
            if (!v) return
            v.currentTime = seconds
            v.play().catch(() => {})
            v.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
    }))

    if (failed)
        return (
            <div className="bg-muted/40 text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
                The original file for “{displayName}” isn’t on disk, so playback
                is unavailable. The conversation still works.
            </div>
        )

    return (
        <video
            ref={videoRef}
            src={`/api/video/${chatId}`}
            controls
            preload="metadata"
            onError={() => setFailed(true)}
            className="bg-muted max-h-[32vh] w-full rounded-xl"
        />
    )
})

const YouTubePlayer = forwardRef<PlayerHandle, { url: string }>(
    function YouTubePlayer({ url }, ref) {
        const frameRef = useRef<HTMLIFrameElement>(null)
        const videoId = parseYouTubeId(url)

        useImperativeHandle(ref, () => ({
            seek(seconds) {
                // The IFrame Player API is driven entirely by postMessage, so
                // seeking needs no script tag and no library — just
                // enablejsapi=1 on the embed URL.
                frameRef.current?.contentWindow?.postMessage(
                    JSON.stringify({
                        event: "command",
                        func: "seekTo",
                        args: [seconds, true]
                    }),
                    "*"
                )
                frameRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest"
                })
            }
        }))

        if (!videoId)
            return (
                <div className="bg-muted/40 text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
                    Couldn’t build a player for this URL.
                </div>
            )

        return (
            <div className="bg-muted mx-auto aspect-video max-h-[32vh] overflow-hidden rounded-xl">
                <iframe
                    ref={frameRef}
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`}
                    title="YouTube video player"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                />
            </div>
        )
    }
)
