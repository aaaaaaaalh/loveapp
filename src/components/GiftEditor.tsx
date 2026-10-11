import { useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { PersonPicker } from './PersonPicker'
import { SafeImage } from './SafeImage'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { priorityLabels } from '../data/labels'
import { isWebUrl } from '../utils/url'
import type { Gift, GiftPriority, PersonId } from '../types/domain'

export function GiftEditor({ gift, defaultOwner, onClose }: { gift?: Gift; defaultOwner: PersonId; onClose: () => void }) {
  const { actions, isDemo } = useSpace()
  const { pending, error: saveError, save } = useSave()
  const [name, setName] = useState(gift?.name ?? '')
  const [image, setImage] = useState(gift?.image.startsWith('http') ? gift.image : '')
  const [price, setPrice] = useState(gift?.price?.toString() ?? '')
  const [link, setLink] = useState(gift?.link ?? '')
  const [note, setNote] = useState(gift?.note ?? '')
  const [owner, setOwner] = useState<PersonId>(gift?.owner ?? defaultOwner)
  const [priority, setPriority] = useState<GiftPriority>(gift?.priority ?? 'medium')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setError('')
    if (!isWebUrl(link) || !isWebUrl(image)) { setError('链接请使用以 http:// 或 https:// 开头的完整网址。'); return }
    const amount = price ? Number(price) : null
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 10000000)) { setError('请输入 0 到 10000000 之间的价格。'); return }
    void save(() => actions.saveGift({ name: name.trim(), image: image.trim() || '/images/gift-placeholder.svg', price: amount, link: link.trim(), note: note.trim(), owner, priority }, gift?.id), isDemo ? '礼物心愿已在本次演示中保存' : '礼物心愿已保存到你们的空间', onClose)
  }
  return <Modal title={gift ? '编辑这份小心动' : '记下一份小心动'} subtitle="不一定立刻拥有，先记住彼此的喜欢。" onClose={onClose} busy={pending}><form onSubmit={submit} className="space-form"><PersonPicker disabled={pending} allowBoth value={owner} onChange={setOwner} label="这是谁想要的礼物" /><label className="form-field"><span>礼物名称</span><input disabled={pending} required maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="想要什么小礼物？" /></label><div className="form-two-columns"><label className="form-field"><span>参考价格（元）<small>选填</small></span><input disabled={pending} type="number" min="0" max="10000000" step="0.01" value={price} onChange={event => setPrice(event.target.value)} placeholder="比如 299" /></label><label className="form-field"><span>心动程度</span><select disabled={pending} value={priority} onChange={event => setPriority(event.target.value as GiftPriority)}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><label className="form-field"><span>商品链接<small>选填</small></span><input disabled={pending} type="url" maxLength={2000} value={link} onChange={event => setLink(event.target.value)} placeholder="https://…" /></label><label className="form-field"><span>图片链接<small>选填</small></span><input disabled={pending} type="url" maxLength={2000} value={image} onChange={event => setImage(event.target.value)} placeholder="留空会使用温暖的礼物插画" /></label>{image && isWebUrl(image) && <SafeImage className="gift-form-preview" src={image} alt="礼物图片预览" />}<label className="form-field"><span>想告诉对方的话<small>选填</small></span><textarea disabled={pending} rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="为什么喜欢它？有什么特别的偏好？" /></label>{(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}<p className="form-notice"><Info size={15} />{isDemo ? '礼物仅记录在本次演示中，不会产生购买行为。' : '这里只记录心愿，不会产生购买行为。'}</p><div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending || !name.trim()}>{pending ? '正在保存…' : gift ? '保存本次修改' : '加入礼物心愿'}</Button></div></form></Modal>
}
