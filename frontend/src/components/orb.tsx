"use client"

import { ThinkingOrb as Base, type ThinkingOrbProps } from "thinking-orbs"

export type { OrbState } from "thinking-orbs"

/**
 * thinking-orbs uses useState/useEffect/useRef but ships no "use client"
 * directive, so importing it from a server component throws
 * "useRef only works in Client Components". This wrapper is the boundary.
 *
 * It also adds `px`, a display size. The library ships only two tuned
 * presets (64 and 20) and treats them as distinct designs rather than a
 * scale factor, so instead of switching preset we keep the 64px design and
 * paint it into fewer CSS pixels. The canvas backing store is still sized
 * for 64, so downscaling supersamples — it stays sharp. Works because the
 * component spreads caller `style` after its own width/height.
 */
export function ThinkingOrb({
    px,
    style,
    ...rest
}: ThinkingOrbProps & { px?: number }) {
    return (
        <Base
            {...rest}
            style={px ? { width: px, height: px, ...style } : style}
        />
    )
}
