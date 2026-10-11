import { useEffect, useState } from 'react'

// Adapted from the MIT reference's useTypewriter.js. A keyed component resets
// the animation; the hook also respects the caller's reduced-motion setting.
export function useTypewriter(text: string, speed = 32, enabled = true) {
  const [length, setLength] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const interval = window.setInterval(() => setLength(value => {
      if (value >= text.length) window.clearInterval(interval)
      return Math.min(text.length, value + 1)
    }), speed)
    return () => window.clearInterval(interval)
  }, [text, speed, enabled])
  return enabled ? text.slice(0, length) : text
}
