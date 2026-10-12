import { useEffect, useState, type FormEvent } from 'react'
import { Users } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { supabase } from '../services/supabaseClient'

export function JoinSpace() {
  const { profile } = useSpace()
  const [open, setOpen] = useState(false)
  return <section className="invite-panel"><h2><Users size={19} />加入对方的小世界</h2><p>已经创建了自己的空间？也可以输入对方的邀请码。</p><Button variant="secondary" onClick={() => setOpen(true)}>加入对方的空间</Button>{open && <JoinSpaceDialog nickname={profile.people.me.name} onClose={() => setOpen(false)} />}</section>
}

type SavedSpace = { space_id: string; name_a: string; name_b: string; is_active: boolean }
export function SpaceSwitcher() {
  const [spaces, setSpaces] = useState<SavedSpace[]>([])
  const { pending, error, save } = useSave()
  useEffect(() => {
    let active = true
    void supabase!.rpc('my_spaces').then(({ data }) => { if (active && data) setSpaces(data as SavedSpace[]) })
    return () => { active = false }
  }, [])
  if (spaces.length < 2) return null
  return <section className="invite-panel"><h2>切换我的空间</h2><p>原空间的记录独立保留，不会自动分享给新空间。</p>{spaces.filter(space => !space.is_active).map(space => <Button key={space.space_id} variant="secondary" disabled={pending} onClick={() => { void save(async () => {
    const { error } = await supabase!.rpc('switch_space', { p_space_id: space.space_id })
    if (error) throw error
  }, '已切换空间', () => window.location.reload()) }}>切换到：{space.name_a} · {space.name_b}</Button>)}{error && <p className="form-error" role="alert">{error}</p>}</section>
}

function JoinSpaceDialog({ nickname, onClose }: { nickname: string; onClose: () => void }) {
  const { pending, error, save } = useSave()
  const [name, setName] = useState(nickname)
  const [code, setCode] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save(async () => {
      const { error } = await supabase!.rpc('join_space', { p_code: code.trim(), p_nickname: name.trim() })
      if (error) throw error
    }, '已加入对方的空间', () => window.location.reload())
  }
  return <Modal title="加入对方的空间" onClose={onClose} busy={pending}><form className="space-form" onSubmit={submit}><p className="form-notice">加入后打开对方的空间。原空间及内容会保留，你可以在「我的」切换回来；原记录不会自动合并或分享。</p><label className="form-field"><span>你的昵称</span><input required maxLength={20} value={name} disabled={pending} onChange={event => setName(event.target.value)} /></label><label className="form-field"><span>对方的邀请码</span><textarea required rows={3} maxLength={64} value={code} disabled={pending} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={event => setCode(event.target.value)} placeholder="粘贴对方在「我的」页面生成的邀请码" /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending || !code.trim() || !name.trim()}>{pending ? '正在加入…' : '确认加入对方空间'}</Button></div></form></Modal>
}
