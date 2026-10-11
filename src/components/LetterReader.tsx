import { useReducedMotion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { useTypewriter } from '../hooks/useTypewriter'
import { useSpace } from '../hooks/useSpace'
import { formatDate } from '../utils/date'
import type { Letter } from '../types/domain'

export function LetterReader({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  const reduce = useReducedMotion()
  const displayed = useTypewriter(letter.content, 22, !reduce)
  const { profile } = useSpace()
  const to = profile.people[letter.author === 'me' ? 'partner' : 'me'].name
  return <Modal title="一封小小的情书" onClose={onClose}><div className="letter-reader"><p className="letter-to">亲爱的{to}：</p><p aria-hidden="true" className="typed-letter">{displayed}<span className="type-cursor" /></p><p className="sr-only">{letter.content}</p><div className="letter-reader-sign"><Heart size={16} /><Avatar person={letter.author} size="sm" showName /><span>{formatDate(letter.createdAt, true)}</span></div></div></Modal>
}
