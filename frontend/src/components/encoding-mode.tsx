"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { AppContext } from "./app-context"

export function EncodingMode() {
    const { mode, setMode } = React.useContext(AppContext)
    const [selected, setSelected] = React.useState(mode as string)

    React.useEffect(() => {
        setMode(selected as typeof mode)
    }, [selected])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">{mode}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={selected}
                    onValueChange={setSelected}
                >
                    <DropdownMenuRadioItem value="transcription-based">
                        transcription-based
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="frame-based">
                        frame-based
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
