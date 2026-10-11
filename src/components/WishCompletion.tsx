import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from './Modal'
import { Button } from './Button'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { localDateString } from '../utils/date'
import type { Wish } from '../types/domain'

export function WishCompletion({ wish, onClose }: { wish: Wish; onClose: () => void }) {
  const { actions, photos, isDemo } = useSpace()
  const { pending, error, save } = useSave()
  const [date, setDate] = useState(wish.completedAt ?? localDateString())
  const [photoId, setPhotoId] = useState(wish.completionPhotoId ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save(() => actions.updateWish(wish.id, { completedAt: date, completionPhotoId: photoId || undefined }), isDemo ? '完成纪念已保存在本次演示中' : '完成纪念已保存', onClose)
  }
  return <Modal title="把实现愿望的这天记下来" subtitle={wish.title} onClose={onClose} busy={pending}><form onSubmit={submit} className="space-form">{error && <p className="form-error" role="alert">{error}</p>}<p className="form-notice">{isDemo ? '这里先关联本次演示照片，刷新后会消失。' : '选一张已经收藏的照片，记录愿望完成的这天。'}</p><label className="form-field"><span>完成日期</span><input disabled={pending} type="date" value={date} max={localDateString()} required onChange={event => setDate(event.target.value)} /></label><label className="form-field"><span>关联一张回忆<small>选填</small></span><select disabled={pending} value={photoId} onChange={event => setPhotoId(event.target.value)}><option value="">先不添加照片</option>{photos.map(photo => <option key={photo.id} value={photo.id}>{photo.description}</option>)}</select></label>{photoId && <img className="completion-preview" src={photos.find(photo => photo.id === photoId)?.src} alt="关联的愿望完成照片" />}<Link to="/photos?upload=1" className="text-link" onClick={onClose}>去照片墙添加本地照片 →</Link><div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending}>{pending ? '正在保存…' : '保存完成纪念'}</Button></div></form></Modal>
}
