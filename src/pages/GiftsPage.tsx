import { useState } from 'react'
import { Plus, Sparkles, Pencil, Trash2, ArrowUpRight, Heart } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { WishTabs } from '../components/WishTabs'
import { Reveal } from '../components/Reveal'
import { Avatar } from '../components/Avatar'
import { SafeImage } from '../components/SafeImage'
import { GiftEditor } from '../components/GiftEditor'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { useSpace } from '../hooks/useSpace'
import { priorityLabels } from '../data/labels'
import { isWebUrl } from '../utils/url'
import type { Gift, PersonId } from '../types/domain'

export function GiftsPage() {
  const { gifts, profile, actions } = useSpace()
  const [owner, setOwner] = useState<PersonId>('me')
  const [editing, setEditing] = useState<Gift | 'new' | null>(null)
  const [removing, setRemoving] = useState<Gift | null>(null)
  const [surpriseInfo, setSurpriseInfo] = useState(false)
  const visible = gifts.filter(gift => gift.owner === owner)
  return <div><PageHeader eyebrow="LITTLE THINGS YOU LOVE" title="心愿礼物" description="记住彼此的小小心动，让心意有迹可循。" action={<Button onClick={() => setEditing('new')}><Plus size={18} />添加礼物</Button>} /><WishTabs />
    <div className="gift-intro"><div><Heart size={19} strokeWidth={1.5} /><span>最好的礼物，是「我记得你喜欢」。</span></div><button onClick={() => setSurpriseInfo(true)}><Sparkles size={15} />惊喜模式 · 敬请期待</button></div>
    <div className="collection-toolbar"><div className="filter-tabs" aria-label="按礼物主人筛选"><button className={owner === 'me' ? 'active' : ''} aria-pressed={owner === 'me'} onClick={() => setOwner('me')}>我的愿望<span className="filter-number">{gifts.filter(gift => gift.owner === 'me').length}</span></button><button className={owner === 'partner' ? 'active' : ''} aria-pressed={owner === 'partner'} onClick={() => setOwner('partner')}>{profile.people.partner.name}的愿望<span className="filter-number">{gifts.filter(gift => gift.owner === 'partner').length}</span></button></div><span className="collection-count">{profile.people[owner].name}的小心动</span></div>
    {visible.length ? <div className="gifts-grid">{visible.map(gift => <Reveal key={gift.id} className="gift-card"><div className="gift-image"><SafeImage src={gift.image} alt={gift.name} loading="lazy" /><span className={`priority-badge priority-${gift.priority}`}>{priorityLabels[gift.priority]}</span><div className="gift-image-actions"><button className="icon-btn" onClick={() => setEditing(gift)} aria-label={`编辑礼物：${gift.name}`}><Pencil size={16} /></button><button className="icon-btn" onClick={() => setRemoving(gift)} aria-label={`删除礼物：${gift.name}`}><Trash2 size={16} /></button></div></div><div className="gift-content"><div className="gift-title-row"><h2>{gift.name}</h2>{gift.price !== null && <span className="gift-price"><small>¥</small>{gift.price.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</span>}</div><p>{gift.note || '未填写备注'}</p><div className="gift-footer"><Avatar person={gift.owner} size="xs" showName />{gift.link && isWebUrl(gift.link) ? <a className="text-link" href={gift.link} target="_blank" rel="noopener noreferrer">看看礼物<ArrowUpRight size={15} /></a> : <span className="gift-no-link">还没选好商品链接</span>}</div></div></Reveal>)}</div> : <EmptyState title="把喜欢的东西，悄悄记下来" description="让对方多了解你一点，从一个小小的心愿开始。" action={<Button onClick={() => setEditing('new')}>添加第一份礼物心愿</Button>} />}
    {editing && <GiftEditor gift={editing === 'new' ? undefined : editing} defaultOwner={owner} onClose={() => setEditing(null)} />}{removing && <ConfirmDialog title={`删除「${removing.name}」？`} onClose={() => setRemoving(null)} onConfirm={() => actions.deleteGift(removing.id)} />}{surpriseInfo && <Modal title="给未来留一点小惊喜" onClose={() => setSurpriseInfo(false)}><div className="about-copy"><p>以后，我们想让你悄悄准备一份惊喜。</p><p>当前版本只记录礼物心愿。当前双方看到相同内容，没有隐藏购买状态或秘密记录。</p><Button onClick={() => setSurpriseInfo(false)}>期待下一次更新</Button></div></Modal>}
  </div>
}
