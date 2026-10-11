import { useState, type FormEvent } from 'react'
import { Send, Info } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { PersonPicker } from './PersonPicker'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import type { PersonId } from '../types/domain'

export function LetterComposer({ onClose }: { onClose: () => void }) {
  const { actions, isDemo } = useSpace()
  const { pending, error, save } = useSave()
  const [author, setAuthor] = useState<PersonId>('me')
  const [content, setContent] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) return
    void save(() => actions.addLetter({ author, content: content.trim() }), isDemo ? '悄悄话已加入本次演示，刷新后不会保留' : '悄悄话已保存到你们的空间', onClose)
  }
  return <Modal title="写一句想对你说的话" subtitle="不必想好措辞，真心就已经很动人。" onClose={onClose} busy={pending}><form onSubmit={submit} className="space-form"><PersonPicker disabled={pending} value={author} onChange={setAuthor} /><label className="form-field"><span>想说的话</span><textarea disabled={pending} required rows={7} maxLength={2000} value={content} placeholder="今天发生了什么？或者，只是有一点想你…" onChange={event => setContent(event.target.value)} /><small className="character-count">{content.length} / 2000</small></label>{error && <p className="form-error" role="alert">{error}</p>}<p className="form-notice"><Info size={15} />{isDemo ? '留言仅保存在本次演示会话中。' : '留言会保存在你们的私密空间中。'}</p><div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>先不写了</Button><Button type="submit" disabled={pending || !content.trim()}><Send size={16} />{pending ? '正在保存…' : isDemo ? '发布到演示空间' : '发布留言'}</Button></div></form></Modal>
}
