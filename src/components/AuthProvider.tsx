import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from '../services/authContext'
import { supabase } from '../services/supabaseClient'
import { readableError } from '../utils/errors'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase) return
    let active = true
    let events = 0
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      events++
      if (active) { setSession(next); setLoading(false); setError('') }
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || events) return
      setSession(data.session)
      setLoading(false)
      if (error) setError(readableError(error))
    }).catch(cause => { if (active) { setLoading(false); setError(readableError(cause)) } })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  return <AuthContext.Provider value={{ session, loading, error,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('请先完成 Supabase 配置。')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUp: async (email, password) => {
      if (!supabase) throw new Error('请先完成 Supabase 配置。')
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, location.origin).href } })
      if (error) throw error
      return Boolean(data.session)
    },
    signOut: async () => {
      if (!supabase) return
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    }
  }}>{children}</AuthContext.Provider>
}
