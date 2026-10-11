import type { SpaceData } from '../types/domain'

// Start with an empty space. Only user-provided records populate these lists.
export const mockData: SpaceData = {
  profile: {
    startDate: '2026-04-20',
    people: {
      me: { id: 'me', name: '石若瀚', avatar: '/images/avatar-me.svg' },
      partner: { id: 'partner', name: '张潋镕', avatar: '/images/avatar-partner.svg' }
    }
  },
  photos: [],
  letters: [],
  wishes: [],
  gifts: []
}
