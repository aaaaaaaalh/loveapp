import { useState } from 'react'
import { PenLine, ArrowDownWideNarrow, Mail, ArrowUpRight } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { Reveal } from '../components/Reveal'
import { EmptyState } from '../components/EmptyState'
import { LetterComposer } from '../components/LetterComposer'
import { LetterReader } from '../components/LetterReader'
import { useSpace } from '../hooks/useSpace'
import { formatDate } from '../utils/date'
import type { Letter, PersonId } from '../types/domain'

export function LettersPage() {
  const { letters, profile } = useSpace()
  const [composer, setComposer] = useState(false)
  const [selected, setSelected] = useState<Letter | null>(null)
  const [filter, setFilter] = useState<'all' | PersonId>('all')
  const [sort, setSort] = useState('newest')
  const visible = [...letters].filter(letter => filter === 'all' || letter.author === filter).sort((a, b) => (sort === 'newest' ? -1 : 1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
  return <div><PageHeader eyebrow="WORDS, FROM THE HEART" title="想对你说" description="有些喜欢，说出来一次，就多一份温暖。" action={<Button onClick={() => setComposer(true)}><PenLine size={18} />写一条留言</Button>} />
    <div className="letters-banner"><Mail size={27} strokeWidth={1.3} /><div><strong>这里装得下日常，也装得下想念。</strong><p>一声早安、一句谢谢、一封没说完的情书，都可以留在这里。</p></div><span aria-hidden="true">with love.</span></div>
    <div className="collection-toolbar"><div className="filter-tabs" aria-label="按作者筛选"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>全部留言</button>{(['me', 'partner'] as const).map(id => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)} aria-pressed={filter === id}>{profile.people[id].name}写的</button>)}</div><label className="sort-control"><ArrowDownWideNarrow size={16} /><span className="sr-only">留言排序</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">最新在前</option><option value="oldest">最早在前</option></select></label></div>
    {visible.length ? <div className="letters-grid">{visible.map(letter => <Reveal key={letter.id} className={`letter-card letter-${letter.tone}`}><div className="letter-card-top"><Avatar person={letter.author} size="sm" showName /><span className="letter-stamp"><Mail size={22} strokeWidth={1} /></span></div><p className="letter-content">{letter.content}</p><div className="letter-card-bottom"><span>{formatDate(letter.createdAt, true)}</span><button className="text-link" onClick={() => setSelected(letter)}>慢慢读<ArrowUpRight size={15} /></button></div></Reveal>)}</div> : <EmptyState title="有些话，正等着被写下来" description="把今天的一点想念，送给心里的那个人。" action={<Button onClick={() => setComposer(true)}>写下第一条留言</Button>} />}
    {composer && <LetterComposer onClose={() => setComposer(false)} />}{selected && <LetterReader key={selected.id} letter={selected} onClose={() => setSelected(null)} />}
  </div>
}
