import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// clerkMiddleware protects nothing by default — the inverse of v4's
// authMiddleware, which protected everything and took a publicRoutes
// allowlist. So the list is inverted here: everything is protected
// except these.
const isPublicRoute = createRouteMatcher([
    "/about",
    "/sign-in(.*)",
    "/sign-up(.*)"
])

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) await auth.protect()
})

export const config = {
    matcher: [
        "/((?!.+\\.[\\w]+$|_next).*)",
        "/",
        "/(api|trpc)(.*)",
        // Clerk's auto-proxy path.
        "/__clerk/:path*"
    ]
}
