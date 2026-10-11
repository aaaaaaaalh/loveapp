import { useState, type FormEvent } from 'react'
import { Heart, LockKeyhole, ArrowRight } from 'lucide-react'
import { PublicFrame } from '../components/PublicFrame'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { useSave } from '../hooks/useSave'

export function LoginPage() {
  const auth = useAuth()
  const { pending, error, save } = useSave()
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save(async () => {
      setConfirmation(false)
      if (register) setConfirmation(!await auth.signUp(email.trim(), password))
      else await auth.signIn(email.trim(), password)
    }, register ? '注册成功，欢迎来到我们的小世界' : '欢迎回到我们的小世界')
  }
  return <PublicFrame><section className="auth-card"><span className="auth-card-icon"><Heart size={26} strokeWidth={1.4} /></span><p className="eyebrow">A LITTLE WORLD, JUST FOR US</p><h1>{register ? '从这里，开始我们的故事' : '欢迎回到我们的小世界'}</h1><p className="auth-subtitle">{register ? '每个人用自己的账号，记录同一个我们。' : '登录后，继续收藏属于你们的日常。'}</p><div className="auth-tabs" role="group" aria-label="账号操作"><button type="button" className={!register ? 'active' : ''} disabled={pending} onClick={() => { setRegister(false); setConfirmation(false) }}>登录</button><button type="button" className={register ? 'active' : ''} disabled={pending} onClick={() => { setRegister(true); setConfirmation(false) }}>注册</button></div><form className="space-form" onSubmit={submit}><label className="form-field"><span>邮箱</span><input type="email" autoComplete="email" required maxLength={254} value={email} disabled={pending} onChange={event => setEmail(event.target.value)} placeholder="你的常用邮箱" /></label><label className="form-field"><span>密码{register && <small>至少 8 位</small>}</span><input type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={128} required value={password} disabled={pending} onChange={event => setPassword(event.target.value)} placeholder={register ? '为自己的账号设置密码' : '输入账号密码'} /></label>{(error || auth.error) && <p className="form-error" role="alert">{error || auth.error}</p>}{confirmation && <p className="auth-confirmation" role="status">请打开邮箱中的确认邮件，完成确认后再回来登录。若已注册，也可以直接尝试登录。</p>}<Button type="submit" disabled={pending || !email.trim() || !password}>{pending ? '请稍等…' : register ? '创建我的账号' : '回到我们的小世界'}<ArrowRight size={17} /></Button></form><p className="auth-privacy"><LockKeyhole size={14} />空间内容只对已加入的两名成员开放</p></section></PublicFrame>
}
