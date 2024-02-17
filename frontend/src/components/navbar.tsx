import { ThemeToggle } from "@/components/theme-toggle"

export const NavBar = () => {
    return (
        <div className="bg-accent flex h-16 w-full items-center gap-4 p-4">
            <p>IUT</p>
            <div className="flex-center ml-auto gap-4">
                <ThemeToggle />
            </div>
        </div>
    )
}
