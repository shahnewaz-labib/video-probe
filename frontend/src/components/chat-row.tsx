"use client"

import { Trash2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteChat } from "@/actions/chat"
import { cn } from "@/lib/utils"

export function ChatRow({
    id,
    name,
    displayName
}: {
    id: string
    name: string
    displayName: string
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [confirming, setConfirming] = useState(false)

    const isActive = pathname === `/chat/${id}`

    const onDelete = () => {
        // Two-step rather than a modal: deletion is irreversible (it drops the
        // messages and the Gemini upload), but a dialog for a sidebar row is
        // heavier than the action warrants.
        if (!confirming) {
            setConfirming(true)
            setTimeout(() => setConfirming(false), 3000)
            return
        }
        startTransition(async () => {
            await deleteChat(id)
            toast.success("Chat deleted")
            if (isActive) router.push("/")
        })
    }

    return (
        <div
            className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                isActive ? "bg-accent font-medium" : "hover:bg-accent/60",
                isPending && "opacity-50"
            )}
        >
            <Link
                href={`/chat/${id}`}
                title={displayName}
                className="min-w-0 flex-1 truncate"
            >
                {name}
            </Link>
            <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                aria-label={confirming ? "Confirm delete" : "Delete chat"}
                className={cn(
                    "shrink-0 rounded p-1 transition-opacity",
                    confirming
                        ? "text-destructive opacity-100"
                        : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                )}
            >
                <Trash2 className="size-3.5" />
            </button>
        </div>
    )
}
