import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface AuthAccess {
  session: Session | null
  loading: boolean
  error: string
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<boolean>
  signOut(): Promise<void>
}

export const AuthContext = createContext<AuthAccess | null>(null)
