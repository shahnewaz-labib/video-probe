import { GoogleGenAI } from "@google/genai"
import { Env } from "./env"

/**
 * SDK shapes verified against @google/genai@2.13.0 type definitions.
 * These differ from what the published JS docs imply — do not "fix" them
 * back without re-reading dist/genai.d.ts:
 *
 *  - files.upload accepts `string | Blob`, so a Web File from formData()
 *    can be passed straight through. No tmp-file round trip needed.
 *  - Streaming events discriminate on `event_type`, NOT `type`.
 *    Union: interaction.created | interaction.completed | interaction.status
 *         | error | step.start | step.delta | step.stop
 *  - A step.delta carries `delta`, itself a discriminated union of ~24 kinds
 *    (TextDelta, ThoughtSummaryDelta, ImageDelta, tool-call deltas, ...).
 *    Only `delta.type === "text"` is user-facing prose. Forwarding without
 *    that check would stream the model's private reasoning to the browser.
 *  - Media resolution is a PER-PART field (`VideoContent.resolution`), not
 *    generation_config.media_resolution — GenerationConfig has no such key.
 *    Accepted values: "low" | "medium" | "high" | "ultra_high".
 *  - Token usage rides on step.delta metadata: metadata.total_usage,
 *    with total_cached_tokens / total_input_tokens.
 */

let client: GoogleGenAI | undefined

/** Lazy so importing this module doesn't require GEMINI_API_KEY at build time. */
export function ai(): GoogleGenAI {
    return (client ??= new GoogleGenAI({ apiKey: Env.geminiApiKey }))
}
