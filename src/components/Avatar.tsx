import { useSpace } from '../hooks/useSpace'
import type { PersonId } from '../types/domain'
import { assetUrl } from '../utils/assetUrl'

export function Avatar({ person, size = 'md', showName = false }: { person: PersonId; size?: 'xs' | 'sm' | 'md' | 'lg'; showName?: boolean }) {
  const { profile } = useSpace()
  const user = profile.people[person]
  return <span className={`avatar-group avatar-${size}`}><img className="avatar" src={assetUrl(user.avatar)} alt={`${user.name}的头像`} width="120" height="120" />{showName && <span className="avatar-name">{user.name}</span>}</span>
}
