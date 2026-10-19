"use client"

import { Maximize2, Minimize2 } from "lucide-react"
import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
    type ReactNode,
    type Ref
} from "react"

import { cn } from "@/lib/utils"
import { parseYouTubeId } from "@/lib/youtube"

/** What the chat needs from either player. */
export type PlayerHandle = { seek: (seconds: number) => void }

/**
 * Starts as a small card beside the title so the conversation gets the
 * room; seeking to a cited moment enlarges it. The player stays mounted in
 * both sizes (only CSS changes), so a YouTube embed keeps its state and
 * its postMessage seek target.
 */
export function VideoPlayer({
    ref,
    chatId,
    displayName,
    source,
    fileUri,
    children
}: {
    ref: Ref<PlayerHandle>
    chatId: string
    displayName: string
    source: string
    fileUri: string
    children?: ReactNode
}) {
    const [expanded, setExpanded] = useState(false)
    const player = useRef<PlayerHandle>(null)

    useImperativeHandle(ref, () => ({
        seek(seconds) {
            setExpanded(true)
            player.current?.seek(seconds)
        }
    }))

    return (
        <div
            data-expanded={expanded}
            className={cn(
                "group flex flex-col gap-4",
                !expanded && "sm:flex-row sm:items-center"
            )}
        >
            {/* Order is swapped with CSS, never in the tree: moving the
                player in the tree would remount the iframe. */}
            <div
                className={cn(
                    "w-full shrink-0",
                    expanded
                        ? // 33vh tall at most: on a 800px laptop anything
                          // bigger leaves the conversation a sliver.
                          "order-2 mx-auto max-w-[calc(33vh*16/9)]"
                        : "sm:w-[220px]"
                )}
            >
                {source === "youtube" ? (
                    <YouTubePlayer ref={player} url={fileUri} />
                ) : (
                    <UploadedPlayer
                        ref={player}
                        chatId={chatId}
                        displayName={displayName}
                    />
                )}
            </div>
            <div className="order-1 flex min-w-0 flex-1 items-start gap-3">
                <div
                    className={cn(
                        "min-w-0 flex-1",
                        // Expanded, title and meta share one line to give
                        // the height back to the conversation.
                        expanded &&
                            "flex flex-wrap items-center gap-x-4 gap-y-2"
                    )}
                >
                    {children}
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Shrink video" : "Expand video"}
                    title={expanded ? "Shrink video" : "Expand video"}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded-md p-2"
                >
                    {expanded ? (
                        <Minimize2 className="size-4" />
                    ) : (
                        <Maximize2 className="size-4" />
                    )}
                </button>
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
            className="aspect-video w-full rounded-xl bg-black"
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
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
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
