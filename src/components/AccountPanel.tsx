import { LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { Button } from './Button'
import { InvitePartner } from './InvitePartner'
import { JoinSpace, SpaceSwitcher } from './JoinSpace'

export function AccountPanel() {
  const auth = useAuth()
  const { memberCount, canInvite, syncStatus } = useSpace()
  const { pending, error, save } = useSave()
  return <><section className="account-panel"><div><h2>我们的私密空间</h2><p className="account-email">{auth.session?.user.email}</p><p><RefreshCw size={13} />{syncStatus} · {memberCount} / 2 位成员</p></div><Button variant="secondary" disabled={pending} onClick={() => { void save(auth.signOut, '已退出登录') }}><LogOut size={15} />{pending ? '正在退出…' : '退出登录'}</Button>{error && <p className="form-error" role="alert">{error}</p>}</section>{canInvite && memberCount === 1 && <><InvitePartner /><JoinSpace /></>}<SpaceSwitcher /></>
}
