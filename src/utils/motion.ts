import type { Variants } from 'framer-motion'

// Adapted from shimmerVariants in the MIT reference's Anniversary.jsx.
// Smaller travel and shorter duration suit a daily-use mobile space.
export const gentleReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
}
