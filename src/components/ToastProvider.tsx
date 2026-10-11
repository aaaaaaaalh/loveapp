import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { ToastContext } from './toastContext'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((value: string) => {
    window.clearTimeout(timer.current)
    setMessage(value)
    timer.current = window.setTimeout(() => setMessage(''), 3400)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return <ToastContext.Provider value={show}>{children}<div className={`toast ${message ? 'toast-visible' : ''}`} role="status" aria-live="polite">{message && <><Check size={17} /><span>{message}</span></>}</div></ToastContext.Provider>
}
