import { mockData } from '../data/mockData'
import type { SpaceRepository } from './spaceRepository'
import type { NewLetter, SpaceData } from '../types/domain'
import { localDateString } from '../utils/date'

/** Memory-only. Every blob URL owned by this repository is revoked on disposal. */
function createDemoRepository(): SpaceRepository {
  let data: SpaceData = structuredClone(mockData)
  const listeners = new Set<() => void>()
  const urls = new Set<string>()
  const emit = (next: SpaceData) => { data = next; listeners.forEach(listener => listener()) }
  return {
    getSnapshot: () => data,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    updateProfile: profile => emit({ ...data, profile }),
    addPhotos: photos => {
      photos.forEach(photo => { if (photo.local && photo.src.startsWith('blob:')) urls.add(photo.src) })
      emit({ ...data, photos: [...photos.map(photo => ({ ...photo, id: crypto.randomUUID() })), ...data.photos] })
    },
    addLetter: (letter: NewLetter) => emit({ ...data, letters: [{ ...letter, id: crypto.randomUUID(), createdAt: new Date().toISOString(), tone: ['cream', 'rose', 'sage'][data.letters.length % 3] as 'cream' | 'rose' | 'sage' }, ...data.letters] }),
    saveWish: (wish, id) => emit({ ...data, wishes: id ? data.wishes.map(item => item.id === id ? { ...item, ...wish, completedAt: wish.status === 'done' ? item.completedAt ?? localDateString() : undefined, completionPhotoId: wish.status === 'done' ? item.completionPhotoId : undefined } : item) : [{ ...wish, id: crypto.randomUUID(), createdAt: localDateString(), completedAt: wish.status === 'done' ? localDateString() : undefined }, ...data.wishes] }),
    updateWish: (id, patch) => emit({ ...data, wishes: data.wishes.map(wish => wish.id === id ? { ...wish, ...patch } : wish) }),
    deleteWish: id => emit({ ...data, wishes: data.wishes.filter(wish => wish.id !== id) }),
    saveGift: (gift, id) => emit({ ...data, gifts: id ? data.gifts.map(item => item.id === id ? { ...item, ...gift } : item) : [{ ...gift, id: crypto.randomUUID() }, ...data.gifts] }),
    updateGift: (id, patch) => emit({ ...data, gifts: data.gifts.map(gift => gift.id === id ? { ...gift, ...patch } : gift) }),
    deleteGift: id => emit({ ...data, gifts: data.gifts.filter(gift => gift.id !== id) }),
    dispose: () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); listeners.clear() }
  }
}

export const spaceRepository = createDemoRepository()
window.addEventListener('pagehide', event => { if (!event.persisted) spaceRepository.dispose() })
if (import.meta.hot) import.meta.hot.dispose(() => spaceRepository.dispose())
