import { ClerkProvider, Show } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { NavBar } from "@/components/navbar"
import { SideBar } from "@/components/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Video Probe",
    description: "Upload a video and ask questions about what's in it."
}

export default async function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                {/* ClerkProvider belongs inside <body>, not wrapping <html>. */}
                <ClerkProvider appearance={{ theme: shadcn }}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="light"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <div className="flex h-dvh overflow-hidden">
                            {/* No chat list for signed-out visitors. */}
                            <Show when="signed-in">
                                <SideBar className="bg-muted/30 hidden w-72 shrink-0 border-r lg:flex" />
                            </Show>
                            <div className="flex min-w-0 flex-1 flex-col">
                                <NavBar className="shrink-0 px-6 lg:px-10" />
                                <main className="min-h-0 flex-1 px-6 lg:px-10">
                                    {children}
                                </main>
                            </div>
                        </div>
                        <Toaster />
                    </ThemeProvider>
                </ClerkProvider>
            </body>
        </html>
    )
}
