import { useState, type FormEvent } from 'react'
import { Heart, Users, LogOut } from 'lucide-react'
import { PublicFrame } from '../components/PublicFrame'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { useSave } from '../hooks/useSave'
import { supabase } from '../services/supabaseClient'
import { mockData } from '../data/mockData'
import { localDateString } from '../utils/date'

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { signOut, session } = useAuth()
  const { pending, error, save } = useSave()
  const [joining, setJoining] = useState(false)
  const [myName, setMyName] = useState(mockData.profile.people.me.name)
  const [partnerName, setPartnerName] = useState(mockData.profile.people.partner.name)
  const [joinName, setJoinName] = useState(mockData.profile.people.partner.name)
  const [date, setDate] = useState(mockData.profile.startDate)
  const [code, setCode] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save(async () => {
      if (!supabase) throw new Error('请先完成 Supabase 配置。')
      const { error } = joining ? await supabase.rpc('join_space', { p_code: code.trim(), p_nickname: joinName.trim() }) : await supabase.rpc('create_space', { p_my_name: myName.trim(), p_partner_name: partnerName.trim(), p_start_date: date || null })
      if (error) throw error
    }, joining ? '已加入你们的空间' : '你们的小世界已准备好', onComplete)
  }
  return <PublicFrame><section className="auth-card onboarding-card"><span className="auth-card-icon"><Users size={26} strokeWidth={1.4} /></span><p className="eyebrow">OUR STORY BEGINS HERE</p><h1>把「我」和「你」，变成「我们」</h1><p className="auth-subtitle">一个人创建空间，另一个人用邀请码加入。</p><div className="auth-tabs" role="group" aria-label="空间操作"><button className={!joining ? 'active' : ''} disabled={pending} onClick={() => setJoining(false)}>创建我们的空间</button><button className={joining ? 'active' : ''} disabled={pending} onClick={() => setJoining(true)}>加入对方的空间</button></div><form className="space-form" onSubmit={submit}>{joining ? <><label className="form-field"><span>你的昵称</span><input required maxLength={20} value={joinName} disabled={pending} onChange={event => setJoinName(event.target.value)} /></label><label className="form-field"><span>对方的邀请码</span><textarea required rows={3} maxLength={64} value={code} disabled={pending} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={event => setCode(event.target.value)} placeholder="粘贴对方从「我的」页面生成的邀请码" /></label></> : <><label className="form-field"><span>你的昵称</span><input required maxLength={20} value={myName} disabled={pending} onChange={event => setMyName(event.target.value)} /></label><label className="form-field"><span>对方的昵称</span><input required maxLength={20} value={partnerName} disabled={pending} onChange={event => setPartnerName(event.target.value)} /></label><label className="form-field"><span>恋爱开始日期<small>选填</small></span><input type="date" min="1900-01-01" max={localDateString()} value={date} disabled={pending} onChange={event => setDate(event.target.value)} /></label><p className="form-notice"><Heart size={15} />空间会从空白开始，照片和文字等你们亲自记录。</p></>}{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={pending || (joining ? !code.trim() || !joinName.trim() : !myName.trim() || !partnerName.trim())}>{pending ? '正在准备…' : joining ? '加入我们的小世界' : '创建我们的小世界'}</Button></form><div className="auth-account"><span>{session?.user.email}</span><button disabled={pending} onClick={() => { void save(signOut, '已退出登录') }}><LogOut size={15} />退出</button></div></section></PublicFrame>
}
