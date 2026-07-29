"use client"

import { Check, Copy, Square } from "lucide-react"
import Link from "next/link"
import {
    FormEvent,
    KeyboardEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useTransition
} from "react"
import { toast } from "sonner"
import { ThinkingOrb } from "@/components/orb"

import { setChatModel } from "@/actions/chat"
import { MessageContent } from "@/components/message-content"
import { ModelSelector } from "@/components/model-selector"
import { Button } from "@/components/ui/button"
import { VideoPlayer, type PlayerHandle } from "@/components/video-player"
import type { VideoModel } from "@/lib/models"
import { cn } from "@/lib/utils"

export type ChatMessage = {
    id: string
    role: string
    content: string
    inputTokens?: number | null
    outputTokens?: number | null
}

const SUGGESTIONS = [
    "What are the main topics covered?",
    "List the key moments with timestamps",
    "Is anything shown on screen that isn't said aloud?"
]

export default function ChatComponent({
    chatId,
    initialMessages,
    isExpired,
    displayName,
    expiresAt,
    source,
    fileUri,
    models,
    model: initialModel
}: {
    chatId: string
    initialMessages: ChatMessage[]
    isExpired: boolean
    displayName: string
    expiresAt: string | null
    source: string
    fileUri: string
    models: VideoModel[]
    model: string
}) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
    const [model, setModel] = useState(initialModel)
    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [expired, setExpired] = useState(isExpired)
    const [, startTransition] = useTransition()

    const playerRef = useRef<PlayerHandle>(null)
    const abortRef = useRef<AbortController | null>(null)
    const ingestFired = useRef(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const scrollerRef = useRef<HTMLDivElement>(null)
    // Released as soon as the user scrolls up: yanking someone back to the
    // bottom mid-read is worse than not following at all.
    const stickToBottom = useRef(true)

    const seek = useCallback((seconds: number) => {
        playerRef.current?.seek(seconds)
    }, [])

    useLayoutEffect(() => {
        if (stickToBottom.current)
            bottomRef.current?.scrollIntoView({ block: "end" })
    }, [messages])

    const onScroll = () => {
        const el = scrollerRef.current
        if (!el) return
        stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }

    const send = useCallback(
        async (body: { prompt?: string }) => {
            setIsLoading(true)
            stickToBottom.current = true

            const controller = new AbortController()
            abortRef.current = controller
            const placeholderId = `pending-${Date.now()}`

            try {
                const res = await fetch(`/api/chat/${chatId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    signal: controller.signal
                })

                if (!res.ok || !res.body) {
                    const message = await res
                        .json()
                        .then((j) => j.message)
                        .catch(() => "Something went wrong.")
                    if (res.status === 410) setExpired(true)
                    toast.error(message)
                    return
                }

                setMessages((m) => [
                    ...m,
                    { id: placeholderId, role: "model", content: "" }
                ])

                const reader = res.body.getReader()
                const decoder = new TextDecoder()

                for (;;) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    setMessages((m) =>
                        m.map((msg) =>
                            msg.id === placeholderId
                                ? { ...msg, content: msg.content + chunk }
                                : msg
                        )
                    )
                }
            } catch (error) {
                if ((error as Error)?.name === "AbortError") toast.info("Stopped.")
                else toast.error("Connection lost. Please try again.")
            } finally {
                abortRef.current = null
                setIsLoading(false)
            }
        },
        [chatId]
    )

    useEffect(() => {
        if (ingestFired.current) return
        ingestFired.current = true
        if (initialMessages.length === 0 && !isExpired) send({})
    }, [initialMessages.length, isExpired, send])

    const submit = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed || isLoading || expired) return
        setPrompt("")
        setMessages((m) => [
            ...m,
            { id: `local-${Date.now()}`, role: "user", content: trimmed }
        ])
        send({ prompt: trimmed })
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit(prompt)
        }
    }

    const totalTokens = messages.reduce(
        (sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0),
        0
    )
    const last = messages[messages.length - 1]
    const awaitingFirstToken = isLoading && (!last || last.role !== "model" || !last.content)
    const showSuggestions =
        !isLoading && !expired && messages.length > 0 && messages.length < 3

    return (
        <div className="mx-auto flex h-full max-w-3xl flex-col">
            <div className="shrink-0 space-y-4 pt-2 pb-5">
                <div className="flex items-center gap-3">
                    <h1
                        className="truncate text-base font-medium"
                        title={displayName}
                    >
                        {displayName}
                    </h1>
                    {expiresAt && (
                        <ExpiryBadge expiresAt={expiresAt} expired={expired} />
                    )}
                    <div className="ml-auto flex shrink-0 items-center gap-3">
                        {totalTokens > 0 && (
                            <span
                                className="text-muted-foreground hidden text-xs tabular-nums sm:inline"
                                title="Tokens billed for this conversation. The video is re-billed every turn."
                            >
                                {totalTokens.toLocaleString()} tok
                            </span>
                        )}
                        <ModelSelector
                            models={models}
                            value={model}
                            disabled={isLoading}
                            onChange={(id) => {
                                setModel(id)
                                startTransition(() => void setChatModel(chatId, id))
                            }}
                        />
                    </div>
                </div>

                <VideoPlayer
                    ref={playerRef}
                    chatId={chatId}
                    displayName={displayName}
                    source={source}
                    fileUri={fileUri}
                />
            </div>

            <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="min-h-0 flex-1 overflow-y-auto"
            >
                <div
                    className="flex flex-col gap-8 pb-10"
                    aria-live="polite"
                    aria-busy={isLoading}
                >
                    {messages.map((message, i) =>
                        message.role === "user" ? (
                            <div key={message.id} className="flex justify-end">
                                <div className="bg-muted max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                                    {message.content}
                                </div>
                            </div>
                        ) : (
                            <ModelTurn
                                key={message.id}
                                content={message.content}
                                onSeek={seek}
                                isStreaming={isLoading && i === messages.length - 1}
                            />
                        )
                    )}

                    {awaitingFirstToken && (
                        <ThinkingStatus ingest={messages.length === 0} />
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>

            <div className="bg-background shrink-0 pt-2 pb-6">
                {expired ? (
                    <p className="text-muted-foreground text-center text-sm">
                        This video expired after 48 hours.{" "}
                        <Link href="/" className="underline">
                            Upload it again
                        </Link>{" "}
                        to keep asking questions.
                    </p>
                ) : (
                    <>
                        {showSuggestions && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => submit(s)}
                                        className="border-input text-muted-foreground hover:bg-accent hover:text-foreground rounded-full border px-3 py-1.5 text-xs transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault()
                                submit(prompt)
                            }}
                            className="border-input bg-background focus-within:ring-ring/40 flex items-end gap-2 rounded-2xl border p-2 shadow-sm focus-within:ring-2"
                        >
                            <textarea
                                value={prompt}
                                rows={1}
                                placeholder="Ask about this video…"
                                onChange={(e) => {
                                    setPrompt(e.currentTarget.value)
                                    e.currentTarget.style.height = "auto"
                                    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 200)}px`
                                }}
                                onKeyDown={onKeyDown}
                                className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed outline-none"
                            />
                            {isLoading ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => abortRef.current?.abort()}
                                    title="Stop generating"
                                >
                                    <Square className="size-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!prompt.trim()}
                                >
                                    Send
                                </Button>
                            )}
                        </form>
                        <p className="text-muted-foreground mt-2 text-center text-[11px]">
                            Enter to send · Shift+Enter for a new line
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

function ModelTurn({
    content,
    isStreaming,
    onSeek
}: {
    content: string
    isStreaming: boolean
    onSeek: (s: number) => void
}) {
    const [copied, setCopied] = useState(false)
    if (!content) return null

    return (
        <div className="group relative">
            <MessageContent
                content={content}
                isStreaming={isStreaming}
                onSeek={onSeek}
            />
            {!isStreaming && (
                <button
                    type="button"
                    aria-label="Copy message"
                    onClick={() => {
                        navigator.clipboard.writeText(content)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                    }}
                    className={cn(
                        "text-muted-foreground hover:text-foreground absolute -top-1 right-0 opacity-0 transition-opacity",
                        "group-hover:opacity-100 focus-visible:opacity-100"
                    )}
                >
                    {copied ? (
                        <Check className="size-4" />
                    ) : (
                        <Copy className="size-4" />
                    )}
                </button>
            )}
        </div>
    )
}

function ExpiryBadge({
    expiresAt,
    expired
}: {
    expiresAt: string
    expired: boolean
}) {
    const [label, setLabel] = useState<string | null>(null)

    // Computed client-side to avoid a server/client clock mismatch on hydrate.
    useEffect(() => {
        const tick = () => {
            const ms = new Date(expiresAt).getTime() - Date.now()
            if (ms <= 0) return setLabel(null)
            const hours = Math.floor(ms / 3_600_000)
            const minutes = Math.floor((ms % 3_600_000) / 60_000)
            setLabel(hours > 0 ? `${hours}h left` : `${minutes}m left`)
        }
        tick()
        const t = setInterval(tick, 60_000)
        return () => clearInterval(t)
    }, [expiresAt])

    if (expired)
        return (
            <span className="bg-destructive/10 text-destructive shrink-0 rounded-full px-2 py-0.5 text-xs">
                expired
            </span>
        )
    if (!label) return null
    return (
        <span
            className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs whitespace-nowrap"
            title="Gemini deletes uploads 48h after upload"
        >
            {label}
        </span>
    )
}

/**
 * The wait before the first token is dominated by Gemini re-reading the
 * whole video — seconds, and proportional to its length. A bare spinner
 * over that window is indistinguishable from a hang, so show elapsed time
 * and escalate the copy to explain what's taking so long.
 */
function ThinkingStatus({ ingest }: { ingest: boolean }) {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        const started = Date.now()
        const t = setInterval(
            () => setSeconds(Math.floor((Date.now() - started) / 1000)),
            1000
        )
        return () => clearInterval(t)
    }, [])

    const message = ingest
        ? seconds < 4
            ? "Watching the video…"
            : seconds < 12
              ? "Reading the audio and visuals…"
              : "Still reading — longer videos take a while."
        : seconds < 4
          ? "Thinking…"
          : seconds < 12
            ? "Re-reading the video for this question…"
            : "Still working — the whole video is re-read each turn."

    return (
        <div className="flex items-center gap-3">
            <ThinkingOrb
                state={ingest ? "searching" : "working"}
                size={64}
                px={36}
                aria-label={ingest ? "Watching the video" : "Thinking"}
            />
            <span className="text-muted-foreground text-sm">
                {message}
                {seconds >= 3 && (
                    <span className="ml-1.5 tabular-nums opacity-60">
                        {seconds}s
                    </span>
                )}
            </span>
        </div>
    )
}
