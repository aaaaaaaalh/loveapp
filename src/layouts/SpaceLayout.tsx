import { useEffect } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { Home, Image, MessageCircle, Heart, UserRound, Leaf } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { useSpace } from '../hooks/useSpace'

const navigation = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/photos', label: '照片', icon: Image },
  { to: '/letters', label: '留言', icon: MessageCircle },
  { to: '/wishes', label: '愿望', icon: Heart },
  { to: '/profile', label: '我的', icon: UserRound }
]

export function SpaceLayout() {
  const { pathname } = useLocation()
  const { profile, isDemo, syncStatus } = useSpace()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="site-header"><div className="header-inner">
      <Link to="/" className="brand" aria-label="Our Space 首页"><span className="brand-symbol"><Heart size={22} strokeWidth={1.5} /></span><span><strong>Our Space<span className="brand-dot">.</span></strong><small>我们的小世界</small></span></Link>
      <nav className="desktop-nav" aria-label="主导航">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive || (to === '/wishes' && pathname === '/gifts') ? 'active' : ''}><Icon size={17} strokeWidth={1.7} />{label}</NavLink>)}</nav>
      <Link to="/profile" className="header-couple" aria-label="查看情侣信息"><span className="header-avatars"><Avatar person="me" size="sm" /><Avatar person="partner" size="sm" /></span><span className="header-names">{profile.people.me.name}<Heart size={10} fill="currentColor" />{profile.people.partner.name}</span></Link>
    </div></header>
    <main id="main-content" className="main-content"><Outlet /></main>
    <footer className="site-footer"><span className="demo-label"><Leaf size={14} />{isDemo ? '演示空间' : '我们的私密空间'}</span><p>{isDemo ? '尚未保存到云端，所有改动仅在本次打开中有效，刷新后会恢复为空白空间。' : `内容保存到你们的空间 · ${syncStatus}`}</p><span className="footer-sign">Made for two, with love.</span></footer>
    <nav className="mobile-nav" aria-label="手机导航">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive || (to === '/wishes' && pathname === '/gifts') ? 'active' : ''}><Icon size={21} strokeWidth={1.65} /><span>{label}</span></NavLink>)}</nav>
  </div>
}
