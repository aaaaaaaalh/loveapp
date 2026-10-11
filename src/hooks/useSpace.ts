import { useContext, useSyncExternalStore } from 'react'
import { SpaceContext } from '../services/spaceContext'

export function useSpace() {
  const access = useContext(SpaceContext)
  const data = useSyncExternalStore(access.repository.subscribe, access.repository.getSnapshot)
  return { ...data, ...access, memberCount: access.getMemberCount?.() ?? access.memberCount, actions: access.repository }
}
