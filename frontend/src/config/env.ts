function required(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`Environment variable ${name} is not defined`)
    return value
}

// Getters, not eager reads: `next build` imports route modules to analyse them,
// so validating at module scope would make builds require production secrets.
// This still fails fast — on first use, at runtime.
export const Env = {
    get geminiApiKey() {
        return required("GEMINI_API_KEY")
    },
    get geminiModel() {
        return process.env.GEMINI_MODEL ?? "gemini-3.6-flash"
    },
    /** Per-part video resolution. "low" ≈ 100 tokens/sec, default ≈ 300. */
    get mediaResolution() {
        return process.env.GEMINI_MEDIA_RESOLUTION ?? "low"
    },
    get maxUploadBytes() {
        return Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024
    },
    get upstashUrl() {
        return required("UPSTASH_REDIS_REST_URL")
    },
    get upstashKey() {
        return required("UPSTASH_REDIS_REST_TOKEN")
    }
}
