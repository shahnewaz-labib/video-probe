import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { UserButton, auth } from "@clerk/nextjs"
import React from "react"
import { ModelSelection } from "./model-switcher"

export const NavBar = async (props: React.HTMLAttributes<HTMLDivElement>) => {
    const { userId } = auth()

    return (
        <div
            {...props}
            className={cn(
                "flex h-16 w-full items-center gap-4",
                props.className
            )}
        >
            <ModelSelection />
            <div className="flex-center ml-auto gap-4">
                <ThemeToggle />
                {userId && <UserButton />}
            </div>
        </div>
    )
}
