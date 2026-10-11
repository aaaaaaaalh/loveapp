import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, Heart, Image, ImagePlus, MessageCircle, Gift, Plus, Check, Quote, Sparkles } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { Reveal } from '../components/Reveal'
import { useSpace } from '../hooks/useSpace'
import { useTimeTogether } from '../hooks/useTimeTogether'
import { useNow } from '../hooks/useNow'
import { formatDate, dottedDate, localDateString } from '../utils/date'

export function HomePage() {
  const { profile, photos, letters, wishes } = useSpace()
  const days = useTimeTogether(profile.startDate)
  const now = useNow()
  const completed = wishes.filter(wish => wish.status === 'done').length
  const recentPhotos = [...photos].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const lastLetter = [...letters].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  const todayLetter = [...letters].filter(letter => localDateString(new Date(letter.createdAt)) === localDateString(now)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  const quote = todayLetter?.content.split('\n').find(line => line.trim())
  const coverPhoto = recentPhotos[0]
  const today = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)
  return <div className="home-page">
    <Reveal className="home-welcome"><div><p className="eyebrow"><span className="little-line" />A LITTLE WORLD, JUST FOR US</p><h1>有你，日常也值得收藏<span className="welcome-dot">。</span></h1><p className="welcome-sub">把平凡的日子，写成我们的故事。</p></div><div className="welcome-right"><p>{today}</p><Link className="btn btn-secondary" to="/photos?upload=1"><Plus size={17} />记录小瞬间</Link></div></Reveal>
    <div className="home-hero-grid">
      <Reveal className="together-card">
        <div className="together-content"><div className="couple-names"><span>{profile.people.me.name}</span><Heart size={15} fill="currentColor" strokeWidth={1} /><span>{profile.people.partner.name}</span></div><p className="together-label">{profile.startDate ? '我们已经在一起' : '我们的恋爱纪念日'}</p><p className={`day-count ${days >= 10_000 ? 'day-count-long' : days >= 1_000 ? 'day-count-medium' : ''}`} data-testid="day-count">{profile.startDate ? <>{days.toLocaleString()}<span>天</span></> : <span className="date-unset">尚未设置</span>}</p>{profile.startDate ? <p className="since-date">SINCE {dottedDate(profile.startDate)}</p> : <Link to="/profile" className="text-link setup-date-link">设置恋爱开始日期<ArrowRight size={13} /></Link>}<div className="together-bottom"><span className="hero-avatars"><Avatar person="me" /><span className="tiny-heart"><Heart size={12} fill="currentColor" /></span><Avatar person="partner" /></span><span>故事还很长，<br />我们慢慢写。</span></div></div>
        <Link to={coverPhoto ? `/photos?photo=${encodeURIComponent(coverPhoto.id)}` : '/photos?upload=1'} className={`hero-photo ${coverPhoto ? '' : 'hero-photo-empty'}`} aria-label={coverPhoto ? '打开我们的回忆' : '添加第一张照片'}>{coverPhoto ? <img src={coverPhoto.src} alt={coverPhoto.description || '你们上传的照片'} fetchPriority="high" /> : <div className="hero-photo-placeholder"><ImagePlus size={32} strokeWidth={1.2} /><p>这里留给<br />你们的第一张照片</p></div>}<span>{coverPhoto ? coverPhoto.description || '未添加描述' : '添加第一张照片'}{coverPhoto ? <Heart size={12} /> : <Plus size={12} />}</span></Link><span className="hero-watermark" aria-hidden="true">us.</span>
      </Reveal>
      <Reveal className="daily-card" delay={0.08}><div className="card-kicker"><Sparkles size={16} /><span>今日一句</span><span className="note-number">01 / EVERY DAY</span></div><Quote className="quote-icon" size={30} strokeWidth={1} />{quote ? <p className="daily-quote">{quote}</p> : <div className="daily-empty"><p>还没有写下今天的话</p><Link to="/letters" className="text-link">写一句自己的话<ArrowRight size={14} /></Link></div>}<div className="daily-bottom"><span>{quote ? '来自你们今天的留言' : '留白，等你们自己填写'}</span><svg viewBox="0 0 80 105" aria-hidden="true"><path d="M40 99V45M39 79Q14 63 19 49q21 4 21 30M41 87q26-10 23-30Q43 61 41 87" fill="none" stroke="#839381" strokeWidth="2" /><path d="M40 51Q9 44 24 15l13 10 9-18 9 19 10-12q10 32-25 37" fill="#db9c9a"/><path d="M39 51q-8-13-2-26M43 50q11-14 3-43" fill="none" stroke="#be7c7d" strokeWidth="1.5"/></svg></div></Reveal>
    </div>
    <Reveal className="quick-links"><Link to="/photos"><span className="quick-icon peach"><Image size={21} /></span><span><strong>我们的回忆</strong><small>把美好留在这里</small></span><ArrowUpRight size={17} /></Link><Link to="/letters"><span className="quick-icon rose"><MessageCircle size={21} /></span><span><strong>想对你说</strong><small>藏在字里行间的喜欢</small></span><ArrowUpRight size={17} /></Link><Link to="/wishes"><span className="quick-icon sage"><Heart size={21} /></span><span><strong>一起去完成</strong><small>让期待慢慢发生</small></span><ArrowUpRight size={17} /></Link><Link to="/gifts"><span className="quick-icon lilac"><Gift size={21} /></span><span><strong>心愿礼物</strong><small>记住你的小小愿望</small></span><ArrowUpRight size={17} /></Link></Reveal>
    <div className="home-lower-grid"><Reveal className="recent-section"><div className="section-heading"><div><p className="eyebrow">OUR LITTLE MOMENTS</p><h2>最近的美好</h2></div><Link to="/photos" className="text-link">查看全部<ArrowRight size={15} /></Link></div>{recentPhotos.length ? <div className="recent-photos">{recentPhotos.map((photo, index) => <Link className="recent-photo" key={photo.id} to={`/photos?photo=${encodeURIComponent(photo.id)}`}><div><img src={photo.src} alt={photo.description || '你们上传的照片'} loading="lazy" /><span className="photo-index">0{index + 1}</span></div><p>{photo.description || '未添加描述'}</p><small>{formatDate(photo.date)}</small></Link>)}</div> : <Link to="/photos?upload=1" className="home-photos-empty"><ImagePlus size={30} strokeWidth={1.3} /><strong>还没有收藏照片</strong><span>从你们的第一张照片开始<Plus size={14} /></span></Link>}</Reveal>
      <div className="home-side"><Reveal className="home-letter"><div className="section-heading"><h2><MessageCircle size={17} />最近的悄悄话</h2><Link to="/letters" aria-label="查看留言墙"><ArrowUpRight size={18} /></Link></div>{lastLetter ? <><p className="home-letter-content">{lastLetter.content}</p><div className="letter-signature"><Avatar person={lastLetter.author} size="xs" showName /><small>{formatDate(lastLetter.createdAt)}</small></div></> : <Link className="text-link" to="/letters">写下第一句想对你说的话<ArrowRight size={15} /></Link>}</Reveal>
        <Reveal className="home-progress"><div className="section-heading"><h2>小愿望，慢慢实现</h2><Link to="/wishes" aria-label="查看愿望清单"><ArrowUpRight size={18} /></Link></div><p>我们一起完成了 <strong>{completed}<span> / {wishes.length}</span></strong> 件想做的事</p><div className="progress-track" role="progressbar" aria-label="愿望完成比例" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={wishes.length || 1}><span style={{ width: `${wishes.length ? completed / wishes.length * 100 : 0}%` }} /></div><span className="progress-caption"><Check size={13} />每一件小事，都在靠近幸福。</span></Reveal></div>
    </div>
    <Reveal className="home-closing"><span /><Heart size={12} /><p>平凡的每一天，因为是我们，就很特别。</p><span /></Reveal>
  </div>
}
