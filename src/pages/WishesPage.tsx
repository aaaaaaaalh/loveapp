import { useState } from 'react'
import { Plus, Heart, Check, CalendarDays, Pencil, Trash2, ImagePlus, Sprout } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { WishTabs } from '../components/WishTabs'
import { Avatar } from '../components/Avatar'
import { Reveal } from '../components/Reveal'
import { EmptyState } from '../components/EmptyState'
import { WishEditor } from '../components/WishEditor'
import { WishCompletion } from '../components/WishCompletion'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useSpace } from '../hooks/useSpace'
import { useSave } from '../hooks/useSave'
import { statusLabels } from '../data/labels'
import { formatDate, localDateString } from '../utils/date'
import type { Wish, WishStatus } from '../types/domain'

export function WishesPage() {
  const { wishes, photos, actions } = useSpace()
  const { pending, error, save } = useSave()
  const [filter, setFilter] = useState<'all' | WishStatus>('all')
  const [editing, setEditing] = useState<Wish | 'new' | null>(null)
  const [removing, setRemoving] = useState<Wish | null>(null)
  const [completion, setCompletion] = useState<Wish | null>(null)
  const done = wishes.filter(wish => wish.status === 'done').length
  const percentage = wishes.length ? Math.round(done / wishes.length * 100) : 0
  const visible = wishes.filter(wish => filter === 'all' || wish.status === filter)
  const changeStatus = (wish: Wish, status: WishStatus) => {
    void save(() => actions.updateWish(wish.id, { status, completedAt: status === 'done' ? localDateString() : undefined, completionPhotoId: status === 'done' ? wish.completionPhotoId : undefined }), status === 'done' ? '又一起完成了一件小事，真好！' : '愿望状态已更新')
  }
  return <div><PageHeader eyebrow="SOMEDAY, WITH YOU" title="我们的愿望清单" description="把「以后一起」变成「我们做到了」。" action={<Button onClick={() => setEditing('new')}><Plus size={18} />添加愿望</Button>} /><WishTabs />{error && <p className="form-error" role="alert">{error}</p>}
    <Reveal className="wish-summary"><div className="wish-summary-icon"><Sprout size={32} strokeWidth={1.3} /></div><div className="wish-summary-copy"><span>我们还有好多美好，要一起经历</span><p>已经完成 <strong>{done}</strong><span> / {wishes.length} 个愿望</span></p></div><div className="wish-summary-progress"><strong>{percentage}<small>%</small></strong><div className="progress-track" role="progressbar" aria-label="愿望完成比例" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div><small>每一次完成，都是我们的里程碑</small></div></Reveal>
    <div className="collection-toolbar"><div className="filter-tabs" aria-label="按愿望状态筛选">{(['all', 'todo', 'planned', 'done'] as const).map(status => <button className={filter === status ? 'active' : ''} key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'all' ? '全部' : statusLabels[status]}<span className="filter-number">{status === 'all' ? wishes.length : wishes.filter(wish => wish.status === status).length}</span></button>)}</div></div>
    {visible.length ? <div className="wishes-grid">{visible.map(wish => <Reveal key={wish.id} className={`wish-card wish-${wish.status}`}><div className="wish-card-main"><span className={`wish-status-icon status-${wish.status}`}>{wish.status === 'done' ? <Check size={22} /> : wish.status === 'planned' ? <CalendarDays size={21} /> : <Heart size={21} />}</span><div className="wish-card-copy"><h2>{wish.title}</h2><p>{wish.description || '未填写描述'}</p></div><div className="card-actions"><button className="icon-btn" onClick={() => setEditing(wish)} aria-label={`编辑愿望：${wish.title}`}><Pencil size={15} /></button><button className="icon-btn" onClick={() => setRemoving(wish)} aria-label={`删除愿望：${wish.title}`}><Trash2 size={15} /></button></div></div><div className="wish-meta"><Avatar person={wish.author} size="xs" showName /><span>{formatDate(wish.createdAt)}</span><label className={`status-select status-${wish.status}`}><span className="sr-only">修改愿望状态：{wish.title}</span><select disabled={pending} value={wish.status} onChange={event => changeStatus(wish, event.target.value as WishStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>{wish.status === 'done' && <div className="wish-completion-row">{wish.completionPhotoId && <img src={photos.find(photo => photo.id === wish.completionPhotoId)?.src} alt="愿望完成照片" />}<span>{wish.completedAt ? `${formatDate(wish.completedAt)} · 我们做到了` : '又一份美好，成为了回忆'}</span><button className="text-link" onClick={() => setCompletion(wish)}><ImagePlus size={14} />记录完成瞬间</button></div>}</Reveal>)}</div> : <EmptyState title={filter === 'done' ? '美好的事，正在慢慢发生' : '给未来的我们，留一个期待'} description="添加一个小愿望，找一天和对方一起完成。" action={<Button onClick={() => setEditing('new')}>添加一个愿望</Button>} />}
    {editing && <WishEditor wish={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}{completion && <WishCompletion wish={completion} onClose={() => setCompletion(null)} />}{removing && <ConfirmDialog title={`删除「${removing.title}」？`} onClose={() => setRemoving(null)} onConfirm={() => actions.deleteWish(removing.id)} />}
  </div>
}
