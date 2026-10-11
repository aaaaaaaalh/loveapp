import { useRef, useState } from 'react'
import { useToast } from './useToast'
import { readableError } from '../utils/errors'

export function useSave() {
  const locked = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const save = async (operation: () => void | Promise<void>, message: string, onSuccess?: () => void) => {
    if (locked.current) return false
    locked.current = true
    setPending(true)
    setError('')
    try {
      await operation()
      toast(message)
      onSuccess?.()
      return true
    } catch (cause) {
      setError(readableError(cause))
      return false
    } finally {
      locked.current = false
      setPending(false)
    }
  }
  return { pending, error, save }
}
