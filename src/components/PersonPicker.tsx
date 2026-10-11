import { useSpace } from '../hooks/useSpace'
import { Avatar } from './Avatar'
import type { PersonId } from '../types/domain'

export function PersonPicker({ value, onChange, label = '这次由谁记录', allowBoth = false, disabled = false }: { value: PersonId; onChange: (value: PersonId) => void; label?: string; allowBoth?: boolean; disabled?: boolean }) {
  const { profile, isDemo, memberCount } = useSpace()
  return <fieldset className="person-picker"><legend>{label}</legend><div>{(['me', 'partner'] as const).map(id => <button key={id} type="button" disabled={disabled || (!isDemo && !allowBoth) || (!isDemo && allowBoth && id === 'partner' && memberCount !== 2)} aria-label={profile.people[id].name} className={value === id ? 'selected' : ''} aria-pressed={value === id} onClick={() => onChange(id)}><Avatar person={id} size="xs" />{profile.people[id].name}</button>)}</div>{!isDemo && !allowBoth && <small>作者由账号记录，不能代对方发布。</small>}</fieldset>
}
