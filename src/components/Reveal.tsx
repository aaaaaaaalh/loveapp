import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { gentleReveal } from '../utils/motion'

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion()
  return <motion.div className={className} variants={gentleReveal} initial={reducedMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.05 }} transition={{ delay }}>{children}</motion.div>
}
