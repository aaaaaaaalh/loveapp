import { useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { PersonPicker } from './PersonPicker'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { statusLabels } from '../data/labels'
import type { PersonId, Wish, WishStatus } from '../types/domain'

export function WishEditor({ wish, onClose }: { wish?: Wish; onClose: () => void }) {
  const { actions, isDemo } = useSpace()
  const { pending, error, save } = useSave()
  const [title, setTitle] = useState(wish?.title ?? '')
  const [description, setDescription] = useState(wish?.description ?? '')
  const [author, setAuthor] = useState<PersonId>(wish?.author ?? 'me')
  const [status, setStatus] = useState<WishStatus>(wish?.status ?? 'todo')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    void save(() => actions.saveWish({ title: title.trim(), description: description.trim(), author, status }, wish?.id), isDemo ? '愿望已在本次演示中保存' : '愿望已保存到你们的空间', onClose)
  }
  return <Modal title={wish ? '把愿望再写好一点' : '我们又有了一个小愿望'} subtitle="想和你一起做的事，值得认真记下来。" onClose={onClose} busy={pending}><form onSubmit={submit} className="space-form"><label className="form-field"><span>愿望标题</span><input disabled={pending} required maxLength={60} value={title} onChange={event => setTitle(event.target.value)} placeholder="比如，一起看一场喜欢的演唱会" /></label><label className="form-field"><span>关于这个愿望<small>选填</small></span><textarea disabled={pending} rows={3} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="想在哪里、什么时候，或者为什么想一起做…" /></label><PersonPicker disabled={pending} value={author} onChange={setAuthor} /><label className="form-field"><span>现在的状态</span><select disabled={pending} value={status} onChange={event => setStatus(event.target.value as WishStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<p className="form-notice"><Info size={15} />{isDemo ? '愿望仅在本次演示会话内有效。' : '愿望会保存到你们的空间，双方都可以更新进度。'}</p><div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending || !title.trim()}>{pending ? '正在保存…' : wish ? '保存本次修改' : '加入愿望清单'}</Button></div></form></Modal>
}
