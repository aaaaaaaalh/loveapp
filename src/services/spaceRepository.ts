import type { CoupleProfile, Gift, NewGift, NewLetter, NewPhoto, NewWish, SpaceData, Wish } from '../types/domain'

/** Replace this adapter with an authenticated Supabase implementation later.
 * UI consumes snapshots and actions, with no storage SDK in page components.
 * A remote adapter may update snapshots after async writes and broadcast changes.
 */
export interface SpaceRepository {
  getSnapshot(): SpaceData
  subscribe(listener: () => void): () => void
  updateProfile(profile: CoupleProfile): void | Promise<void>
  addPhotos(photos: NewPhoto[]): void | Promise<void>
  addLetter(letter: NewLetter): void | Promise<void>
  saveWish(wish: NewWish, id?: string): void | Promise<void>
  updateWish(id: string, patch: Partial<Wish>): void | Promise<void>
  deleteWish(id: string): void | Promise<void>
  saveGift(gift: NewGift, id?: string): void | Promise<void>
  deleteGift(id: string): void | Promise<void>
  updateGift(id: string, patch: Partial<Gift>): void | Promise<void>
  dispose(): void
}
