"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import type { VideoModel } from "@/lib/models"

export function ModelSelector({
    models,
    value,
    onChange,
    disabled
}: {
    models: VideoModel[]
    value: string
    onChange: (id: string) => void
    disabled?: boolean
}) {
    const current = models.find((m) => m.id === value)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button variant="outline" size="sm" disabled={disabled}>
                    <span className="truncate">{current?.label ?? value}</span>
                    {current?.tier && (
                        <span className="text-muted-foreground ml-1.5 text-[10px] tracking-wide uppercase">
                            {current.tier}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="max-h-96 w-72 overflow-y-auto"
            >
                <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                    {models.map((m) => (
                        <DropdownMenuRadioItem
                            key={m.id}
                            value={m.id}
                            className="items-start py-2"
                        >
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate">{m.label}</span>
                                {m.hint && (
                                    <span className="text-muted-foreground text-xs">
                                        {m.hint}
                                    </span>
                                )}
                            </div>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
