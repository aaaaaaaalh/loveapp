import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { cloudRequested, configurationError, supabase } from '../services/supabaseClient'
import { SpaceContext } from '../services/spaceContext'
import { createSupabaseRepository } from '../services/supabaseRepository'
import type { MemberRow } from '../types/database'
import { readableError } from '../utils/errors'
import { PublicFrame } from './PublicFrame'
import { Button } from './Button'
import { LoginPage } from '../pages/LoginPage'
import { OnboardingPage } from '../pages/OnboardingPage'

type RemoteRepository = ReturnType<typeof createSupabaseRepository>
type CloudState = { kind: 'loading' } | { kind: 'onboarding' } | { kind: 'error'; message: string } | { kind: 'ready'; repository: RemoteRepository; membership: MemberRow }

function CloudSpace({ userId, children }: { userId: string; children: ReactNode }) {
  const { signOut } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<CloudState>({ kind: 'loading' })
  const [syncStatus, setSyncStatus] = useState('正在同步')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    let repository: RemoteRepository | undefined
    const load = async () => {
      const { data, error } = await supabase!.from('space_members').select('space_id,user_id,slot').eq('user_id', userId).maybeSingle<MemberRow>()
      if (error) throw error
      if (!active) return
      if (!data) { setState({ kind: 'onboarding' }); return }
      repository = createSupabaseRepository(supabase!, data, (status, error) => { if (active) { setSyncStatus(status); setNotice(error) } })
      await repository.initialize()
      if (active) setState({ kind: 'ready', repository, membership: data })
    }
    void load().catch(cause => { if (active) { repository?.dispose(); setState({ kind: 'error', message: readableError(cause) }) } })
    return () => { active = false; repository?.dispose() }
  }, [userId, attempt])
  const retry = () => { setState({ kind: 'loading' }); setAttempt(value => value + 1) }
  if (state.kind === 'loading') return <PublicFrame><section className="auth-card" role="status"><h1>正在打开我们的小世界…</h1><p className="auth-subtitle">让记忆回到它们的位置。</p></section></PublicFrame>
  if (state.kind === 'onboarding') return <OnboardingPage onComplete={retry} />
  if (state.kind === 'error') return <PublicFrame><section className="auth-card"><h1>暂时没能打开空间</h1><p className="form-error" role="alert">{state.message}</p><div className="form-actions"><Button onClick={retry}>再试一次</Button><Button variant="secondary" onClick={() => { void signOut().catch(cause => setNotice(readableError(cause))) }}>退出登录</Button></div>{notice && <p role="alert">{notice}</p>}</section></PublicFrame>
  return <SpaceContext.Provider value={{ repository: state.repository, isDemo: false, spaceId: state.membership.space_id, getMemberCount: state.repository.getMemberCount, canInvite: state.membership.slot === 0, syncStatus }}>
    {notice && <div className="sync-notice" role="status"><span>{notice}</span><button onClick={() => { void state.repository.refresh().catch(cause => setNotice(readableError(cause))) }}>重新同步</button></div>}{children}
  </SpaceContext.Provider>
}

export function CloudGate({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (!cloudRequested) return children
  if (configurationError) return <PublicFrame><section className="auth-card"><h1>连接配置还差一步</h1><p role="alert" className="form-error">{configurationError}</p><p className="auth-subtitle">修改本地配置后，重新启动预览服务即可。</p></section></PublicFrame>
  if (auth.loading) return <PublicFrame><section className="auth-card" role="status">正在恢复登录状态…</section></PublicFrame>
  if (!auth.session) return <LoginPage />
  return <CloudSpace key={auth.session.user.id} userId={auth.session.user.id}>{children}</CloudSpace>
}
