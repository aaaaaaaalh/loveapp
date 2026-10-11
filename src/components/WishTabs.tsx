import { NavLink } from 'react-router-dom'
import { Heart, Gift } from 'lucide-react'

export function WishTabs() {
  return <nav className="wish-tabs" aria-label="愿望类型"><NavLink to="/wishes"><Heart size={17} />想做的事</NavLink><NavLink to="/gifts"><Gift size={17} />想要的礼物</NavLink></nav>
}
