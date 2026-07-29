import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import React from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const NavBar = (props: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            {...props}
            className={cn(
                "flex h-14 w-full shrink-0 items-center gap-4",
                props.className
            )}
        >
            <div className="ml-auto flex items-center gap-3">
                <ThemeToggle />

                <Show when="signed-out">
                    <SignInButton mode="modal">
                        <Button variant="ghost" size="sm">
                            Sign in
                        </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <Button size="sm">Sign up</Button>
                    </SignUpButton>
                </Show>

                <Show when="signed-in">
                    <UserButton />
                </Show>
            </div>
        </div>
    )
}
