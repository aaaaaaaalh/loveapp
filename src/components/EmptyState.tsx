import { Heart } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Heart size={28} strokeWidth={1.3} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}
