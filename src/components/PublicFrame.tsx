import type { ReactNode } from 'react'
import { Heart } from 'lucide-react'

export function PublicFrame({ children }: { children: ReactNode }) {
  return <main className="public-frame"><div className="public-brand"><span className="brand-symbol"><Heart size={25} strokeWidth={1.4} /></span><strong>Our Space<span className="brand-dot">.</span></strong><small>我们的小世界</small></div>{children}<p className="public-footer">两个人，一点一滴，一个属于我们的小世界。</p></main>
}
