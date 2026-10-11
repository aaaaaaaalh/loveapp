import { useState } from 'react'
import { Heart, Pencil, CalendarDays, Info, ChevronRight, Leaf, LockKeyhole, Image, MessageCircle, Gift } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { Reveal } from '../components/Reveal'
import { Modal } from '../components/Modal'
import { ProfileEditor } from '../components/ProfileEditor'
import { AccountPanel } from '../components/AccountPanel'
import packageInfo from '../../package.json'
import { useSpace } from '../hooks/useSpace'
import { useTimeTogether } from '../hooks/useTimeTogether'
import { formatDate } from '../utils/date'

export function ProfilePage() {
  const { profile, photos, letters, wishes, gifts, isDemo } = useSpace()
  const days = useTimeTogether(profile.startDate)
  const [editing, setEditing] = useState(false)
  const [about, setAbout] = useState(false)
  return <div className="profile-page"><PageHeader eyebrow="YOU, ME & OUR SPACE" title="关于我们" description="两个人，一点一滴，一个属于我们的小世界。" />
    <div className="profile-grid"><Reveal className="profile-main-card"><div className="profile-pair"><Avatar person="me" size="lg" /><span><Heart size={23} strokeWidth={1.3} fill="currentColor" /></span><Avatar person="partner" size="lg" /></div><h2>{profile.people.me.name}<span>&</span>{profile.people.partner.name}</h2>{profile.startDate ? <p>一起走过的第 <strong>{days}</strong> 天</p> : <p>恋爱开始日期，等你们自己填写</p>}<Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={15} />编辑我们的信息</Button><span className="profile-since">{profile.startDate ? `OUR STORY BEGAN ON ${profile.startDate.replaceAll('-', '.')}` : 'OUR STORY STARTS WITH YOU'}</span></Reveal>
      <Reveal className="profile-details"><h2>我们的故事</h2><div className="profile-detail-row"><span><CalendarDays size={19} />恋爱开始日期</span><strong>{profile.startDate ? formatDate(profile.startDate, true) : '尚未设置'}</strong></div><div className="profile-detail-row"><span><Heart size={19} />我的昵称</span><strong>{profile.people.me.name}</strong></div><div className="profile-detail-row"><span><Heart size={19} />对方的昵称</span><strong>{profile.people.partner.name}</strong></div><div className="profile-stat-grid"><div><Image size={18} /><strong>{photos.length}</strong><span>小瞬间</span></div><div><MessageCircle size={18} /><strong>{letters.length}</strong><span>悄悄话</span></div><div><Heart size={18} /><strong>{wishes.length}</strong><span>共同愿望</span></div><div><Gift size={18} /><strong>{gifts.length}</strong><span>礼物心愿</span></div></div></Reveal>
    </div><Reveal className="profile-settings"><button onClick={() => setAbout(true)}><span className="setting-icon"><Info size={20} /></span><span><strong>关于 Our Space</strong><small>让喜欢，融进每一天的日常</small></span><ChevronRight size={19} /></button><div><span className="setting-icon"><Leaf size={20} /></span><span><strong>{isDemo ? '当前是演示模式' : '内容已启用云端保存'}</strong><small>{isDemo ? '没有账号登录，所有新增和修改刷新后会恢复' : '使用各自的账号，记录同一个我们'}</small></span><span className="version-tag">v{packageInfo.version}</span></div></Reveal>{!isDemo && <AccountPanel />}<p className="privacy-note"><LockKeyhole size={14} />{isDemo ? '当前仍是演示模式，尚未配置云端保存，请勿输入敏感信息。' : '只有已加入空间的两个人可以访问，记得妥善保管各自的账号。'}</p>
    {editing && <ProfileEditor onClose={() => setEditing(false)} />}{about && <Modal title="Our Space · 我们的小世界" onClose={() => setAbout(false)}><div className="about-copy"><p className="about-slogan">让日常成为回忆，让喜欢有处安放。</p><p>Our Space 是为两个人设计的长期生活记录空间。在这里，收藏照片、写下想念、完成共同愿望，也记住彼此喜欢的礼物。</p><p>当前版本 <strong>v{packageInfo.version}</strong>。{isDemo ? '未配置云端时是前端演示，内容仅在本次打开中保留。' : '记录保存在你们的空间，登录自己的账号即可继续查看。'}</p><p>部分柔和配色和动画改编自 Navaneeth.k.v 的 MIT 开源项目。原作者授权与来源已保存在项目中。</p><Button variant="secondary" onClick={() => setAbout(false)}>回到我们的小世界</Button></div></Modal>}
  </div>
}
