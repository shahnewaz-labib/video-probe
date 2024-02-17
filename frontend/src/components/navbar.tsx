import { ThemeToggle } from "@/components/theme-toggle"
import { UserButton, auth } from "@clerk/nextjs"

export const NavBar = async () => {
    const { userId } = auth()

    return (
        <div className="bg-accent flex h-16 w-full items-center gap-4 px-32">
            <p>IUT GENESIS</p>
            <div className="flex-center ml-auto gap-4">
                <ThemeToggle />
                {userId && <UserButton />}
            </div>
        </div>
    )
}
