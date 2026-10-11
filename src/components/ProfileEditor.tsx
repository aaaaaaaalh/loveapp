import { useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { localDateString } from '../utils/date'

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { profile, actions, isDemo } = useSpace()
  const { pending, error, save } = useSave()
  const [myName, setMyName] = useState(profile.people.me.name)
  const [partnerName, setPartnerName] = useState(profile.people.partner.name)
  const [date, setDate] = useState(profile.startDate)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!myName.trim() || !partnerName.trim() || (date && date > localDateString())) return
    void save(() => actions.updateProfile({ people: { me: { ...profile.people.me, name: myName.trim() }, partner: { ...profile.people.partner, name: partnerName.trim() } }, startDate: date }), isDemo ? '我们的信息已更新，仅在本次演示中有效' : '我们的信息已保存', onClose)
  }
  return <Modal title="编辑我们的信息" subtitle="故事从这一天开始，以我们的名字继续。" onClose={onClose} busy={pending}><form onSubmit={submit} className="space-form"><label className="form-field"><span>我的昵称</span><input disabled={pending} required maxLength={20} value={myName} onChange={event => setMyName(event.target.value)} /></label><label className="form-field"><span>对方的昵称</span><input disabled={pending} required maxLength={20} value={partnerName} onChange={event => setPartnerName(event.target.value)} /></label><label className="form-field"><span>恋爱开始日期<small>可以稍后填写</small></span><input disabled={pending} type="date" min="1900-01-01" max={localDateString()} value={date} onChange={event => setDate(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<p className="form-notice"><Info size={15} />{isDemo ? '信息会即时更新到所有页面，刷新后恢复默认配置。' : '保存后，两个人看到的昵称和恋爱日期都会更新。'}</p><div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending || !myName.trim() || !partnerName.trim()}>{pending ? '正在保存…' : isDemo ? '保存演示信息' : '保存信息'}</Button></div></form></Modal>
}
