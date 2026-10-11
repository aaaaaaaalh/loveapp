import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { formatDate } from '../utils/date'
import type { Photo } from '../types/domain'

export function PhotoLightbox({ photos, index, onChange, onClose }: { photos: Photo[]; index: number; onChange: (index: number) => void; onClose: () => void }) {
  const photo = photos[index]
  const prev = () => onChange((index - 1 + photos.length) % photos.length)
  const next = () => onChange((index + 1) % photos.length)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); onChange((index - 1 + photos.length) % photos.length) }
      if (event.key === 'ArrowRight') { event.preventDefault(); onChange((index + 1) % photos.length) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onChange, photos.length])
  if (!photo) return null
  return <Modal title="我们的回忆" subtitle={`${index + 1} / ${photos.length} · 用左右方向键翻看`} onClose={onClose} wide className="lightbox-dialog"><div className="lightbox-image"><img key={photo.id} src={photo.src} alt={photo.description} /><button className="lightbox-arrow lightbox-prev" onClick={prev} aria-label="上一张照片"><ChevronLeft size={24} /></button><button className="lightbox-arrow lightbox-next" onClick={next} aria-label="下一张照片"><ChevronRight size={24} /></button></div><div className="lightbox-caption"><p>{photo.description}</p><div><Avatar person={photo.author} size="xs" showName /><span>{formatDate(photo.date, true)}</span></div>{photo.local && <small><Info size={13} />本地演示照片，刷新后不会保留</small>}</div></Modal>
}
