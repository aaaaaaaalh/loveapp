import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Image, Leaf } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { Reveal } from '../components/Reveal'
import { EmptyState } from '../components/EmptyState'
import { PhotoUpload } from '../components/PhotoUpload'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { useSpace } from '../hooks/useSpace'
import { dottedDate } from '../utils/date'
import type { PersonId } from '../types/domain'

export function PhotosPage() {
  const { photos, profile } = useSpace()
  const [filter, setFilter] = useState<'all' | PersonId>('all')
  const [params, setParams] = useSearchParams()
  const sorted = [...photos].sort((a, b) => b.date.localeCompare(a.date))
  const visible = sorted.filter(photo => filter === 'all' || photo.author === filter)
  const selectedIndex = sorted.findIndex(photo => photo.id === params.get('photo'))
  const showUpload = () => setParams({ upload: '1' })
  const close = () => setParams({}, { replace: true })
  return <div><PageHeader eyebrow="MEMORIES, MADE TOGETHER" title="我们的回忆" description="照片会记得，那些我们不想忘记的瞬间。" action={<Button onClick={showUpload}><Plus size={18} />上传照片</Button>} />
    <div className="collection-toolbar"><div className="filter-tabs" aria-label="按上传者筛选"><button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>全部回忆</button>{(['me', 'partner'] as const).map(id => <button key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{profile.people[id].name}的镜头</button>)}</div><span className="collection-count"><Image size={15} />{visible.length} 个小瞬间</span></div>
    {visible.length ? <div className="photo-masonry">{visible.map(photo => <Reveal className="photo-card" key={photo.id}><button className="photo-open" onClick={() => setParams({ photo: photo.id })} aria-label={`查看照片：${photo.description}`}><img src={photo.src} alt={photo.description} style={{ aspectRatio: photo.ratio }} loading="lazy" /><span className="photo-open-hint">放大这份美好</span>{photo.local && <span className="photo-local"><Leaf size={11} />本地演示</span>}</button><div className="photo-card-info"><p>{photo.description}</p><div><span>{dottedDate(photo.date)}</span><Avatar person={photo.author} size="xs" showName /></div></div></Reveal>)}</div> : <EmptyState title="这里，等一个值得收藏的瞬间" description="选一张照片，把你眼里的美好分享给对方。" action={<Button onClick={showUpload}><Plus size={17} />添加第一张照片</Button>} />}
    {params.get('upload') === '1' && <PhotoUpload onClose={close} />}
    {selectedIndex >= 0 && <PhotoLightbox photos={sorted} index={selectedIndex} onClose={close} onChange={index => setParams({ photo: sorted[index].id }, { replace: true })} />}
  </div>
}
