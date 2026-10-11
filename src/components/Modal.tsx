import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({ title, subtitle, onClose, children, wide = false, className = '', busy = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean; className?: string; busy?: boolean }) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const reducedMotion = useReducedMotion()
  useEffect(() => { closeRef.current = busy ? () => undefined : onClose }, [onClose, busy])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const root = document.getElementById('root')
    document.body.style.overflow = 'hidden'
    if (root) root.inert = true
    const dialog = dialogRef.current
    const frame = requestAnimationFrame(() => (dialog?.querySelector<HTMLElement>('input, textarea, select, button') ?? dialog)?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
      if (event.key === 'Tab') {
        const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex="0"]') ?? []).filter(element => element.getClientRects().length)
        const first = focusable[0]
        const last = focusable.at(-1)
        if (!first) { event.preventDefault(); dialog?.focus(); return }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (root) root.inert = false
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(<motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} onClick={event => { if (!busy && event.target === event.currentTarget) onClose() }}>
    <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`modal-dialog ${wide ? 'modal-wide' : ''} ${className}`} initial={{ y: reducedMotion ? 0 : 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <div className="modal-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" disabled={busy} onClick={onClose} aria-label="关闭弹窗"><X size={21} /></button></div>
      <div className="modal-content">{children}</div>
    </motion.div>
  </motion.div>, document.body)
}
