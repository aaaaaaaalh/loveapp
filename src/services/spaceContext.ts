import { createContext } from 'react'
import { spaceRepository } from './demoRepository'
import type { SpaceRepository } from './spaceRepository'

export interface SpaceAccess {
  repository: SpaceRepository
  isDemo: boolean
  spaceId?: string
  memberCount?: number
  getMemberCount?: () => number
  canInvite?: boolean
  syncStatus?: string
}

export const SpaceContext = createContext<SpaceAccess>({ repository: spaceRepository, isDemo: true })
