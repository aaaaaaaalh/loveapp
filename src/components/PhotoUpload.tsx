import { useState, type FormEvent, type ChangeEvent } from 'react'
import { ImagePlus, X, Info } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { PersonPicker } from './PersonPicker'
import { useObjectUrls } from '../hooks/useObjectUrls'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { localDateString } from '../utils/date'
import type { PersonId } from '../types/domain'

interface SelectedFile { src: string; description: string; ratio: number; ready: boolean; name: string }

export function PhotoUpload({ onClose }: { onClose: () => void }) {
  const { actions, isDemo } = useSpace()
  const { pending, error: saveError, save } = useSave()
  const objectUrls = useObjectUrls()
  const [selected, setSelected] = useState<SelectedFile[]>([])
  const [author, setAuthor] = useState<PersonId>('me')
  const [date, setDate] = useState(localDateString())
  const [error, setError] = useState('')
  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    const valid = files.filter(file => ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type) && file.size <= 12 * 1024 * 1024).slice(0, 12)
    setError(files.length !== valid.length ? '每次最多 12 张，请选择小于 12 MB 的 JPG、PNG、WebP、GIF 或 AVIF 图片。' : '')
    selected.forEach(file => objectUrls.release(file.src))
    setSelected(valid.map(file => ({ src: objectUrls.create(file), description: '', ratio: 1, ready: false, name: file.name })))
    event.target.value = ''
  }
  const remove = (src: string) => { objectUrls.release(src); setSelected(files => files.filter(file => file.src !== src)) }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!selected.length || selected.some(file => !file.ready)) return
    void save(() => actions.addPhotos(selected.map(file => ({ src: file.src, description: file.description.trim(), ratio: file.ratio, date, author, local: true }))), isDemo ? `已加入 ${selected.length} 张照片到本次演示，尚未保存到云端` : `已保存 ${selected.length} 张照片`, () => { selected.forEach(file => objectUrls.transfer(file.src)); onClose() })
  }
  return <Modal title="收藏一个小瞬间" subtitle="有些美好，值得被好好记住。" onClose={onClose} busy={pending} wide><form onSubmit={submit} className="space-form">
    <p className="form-notice"><Info size={16} />{isDemo ? '演示模式：图片仅在当前会话预览，刷新后会消失，不会上传到云端。' : '照片将保存到私密空间，只有你们两个人可以查看。'}</p>
    <label className="upload-dropzone"><ImagePlus size={32} strokeWidth={1.4} /><strong>{selected.length ? '重新选择图片' : '选择想收藏的照片'}</strong><span>JPG / PNG / WebP / GIF / AVIF，每张不超过 12 MB</span><input disabled={pending} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={chooseFiles} aria-label="选择本地图片" /></label>
    {(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}
    {!!selected.length && <div className="upload-previews">{selected.map((file, index) => <div key={file.src} className="upload-preview"><div><img src={file.src} alt={`待上传图片 ${index + 1}`} onLoad={event => { const { naturalWidth, naturalHeight } = event.currentTarget; setSelected(items => items.map(item => item.src === file.src ? { ...item, ready: true, ratio: naturalWidth / naturalHeight } : item)) }} onError={() => { remove(file.src); setError('有一张图片无法读取，请换一张试试。') }} /><button type="button" disabled={pending} className="preview-remove" aria-label={`移除图片 ${index + 1}`} onClick={() => remove(file.src)}><X size={15} /></button></div><label><span className="sr-only">图片 {index + 1} 描述</span><input disabled={pending} value={file.description} maxLength={120} placeholder="给这张照片写一句话…" onChange={event => setSelected(items => items.map(item => item.src === file.src ? { ...item, description: event.target.value } : item))} /></label></div>)}</div>}
    <PersonPicker disabled={pending} value={author} onChange={setAuthor} /><label className="form-field"><span>这一天</span><input disabled={pending} type="date" required value={date} max={localDateString()} onChange={event => setDate(event.target.value)} /></label>
    <div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending || !selected.length || selected.some(file => !file.ready)}>{pending ? '正在保存…' : isDemo ? '加入本次演示' : '保存照片'}{selected.length ? ` · ${selected.length} 张` : ''}</Button></div>
  </form></Modal>
}
