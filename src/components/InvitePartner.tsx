import { useState } from 'react'
import { Copy, Users } from 'lucide-react'
import { Button } from './Button'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { supabase } from '../services/supabaseClient'

export function InvitePartner() {
  const { spaceId } = useSpace()
  const { pending, error, save } = useSave()
  const [code, setCode] = useState('')
  return <section className="invite-panel"><h2><Users size={19} />邀请对方，来到同一个小世界</h2><p>对方注册并登录后，选择「加入对方的空间」，粘贴邀请码即可。</p><Button variant="secondary" disabled={pending} onClick={() => { void save(async () => {
    const { data, error } = await supabase!.rpc('create_space_invite', { p_space_id: spaceId })
    if (error) throw error
    setCode(String(data))
  }, '邀请码已生成') }}>{pending ? '正在生成…' : code ? '重新生成邀请码' : '生成邀请码'}</Button>{code && <><label className="form-field"><span>邀请码</span><textarea aria-label="邀请码" readOnly rows={3} value={code} onFocus={event => event.target.select()} /></label><Button variant="secondary" disabled={pending} onClick={() => { void save(() => navigator.clipboard.writeText(code), '邀请码已复制') }}><Copy size={15} />复制邀请码</Button><small>有效期 7 天，只能使用一次。重新生成会使旧邀请码失效，请只分享给对方。</small></>}{error && <p className="form-error" role="alert">{error}</p>}</section>
}
