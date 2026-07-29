// Keep the proxy body limit above the app's own upload limit. When a proxy
// runs, Next buffers the whole request body in memory so both proxy and route
// can read it — and on overflow it TRUNCATES silently rather than erroring,
// which corrupts multipart uploads. Headroom ensures our own 413 fires first.
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 500)

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // TypeScript 7 dropped the compiler API Next's type-check worker uses.
        // This routes type checking through the tsc CLI instead.
        useTypeScriptCli: true,
        proxyClientMaxBodySize: `${maxUploadMb + 16}mb`
    }
}

export default nextConfig
