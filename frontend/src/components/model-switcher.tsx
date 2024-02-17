"use client"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useContext } from "react"
import { AppContext } from "./app-context"

export function ModelSelection() {
    const { selectedModel, setSelectedModel } = useContext(AppContext)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">{selectedModel}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={selectedModel}
                    // @ts-ignore
                    onValueChange={setSelectedModel}
                >
                    <DropdownMenuRadioItem value="gpt-3.5-turbo">
                        gpt-3.5-turbo
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="gpt-4-vision-preview">
                        gpt-4-vision-preview
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
