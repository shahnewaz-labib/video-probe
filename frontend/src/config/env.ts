export const Env: Record<string, string> = {
    backendUrl: process.env.BACKEND_URL || "http://localhost:8001",
    backendApiKey: process.env.BACKEND_API_KEY!,
    openaiKey: process.env.OPENAI_API_KEY!,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL!,
    upstashKey: process.env.UPSTASH_REDIS_REST_TOKEN!
}

Object.entries(Env).forEach(([key, value]) => {
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is not defined`)
    }
})
