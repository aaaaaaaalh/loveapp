export type PersonId = 'me' | 'partner'
export type WishStatus = 'todo' | 'planned' | 'done'
export type GiftPriority = 'high' | 'medium' | 'low'

export interface Person { id: PersonId; name: string; avatar: string }
export interface CoupleProfile { people: Record<PersonId, Person>; startDate: string }
export interface Photo { id: string; src: string; description: string; date: string; author: PersonId; ratio: number; local?: boolean }
export interface Letter { id: string; author: PersonId; content: string; createdAt: string; tone: 'rose' | 'cream' | 'sage' }
export interface Wish { id: string; title: string; description: string; author: PersonId; createdAt: string; status: WishStatus; completedAt?: string; completionPhotoId?: string }
export interface Gift { id: string; name: string; image: string; price: number | null; link: string; note: string; owner: PersonId; priority: GiftPriority }
export interface SpaceData { profile: CoupleProfile; photos: Photo[]; letters: Letter[]; wishes: Wish[]; gifts: Gift[] }
export type NewPhoto = Omit<Photo, 'id'>
export type NewLetter = Omit<Letter, 'id' | 'createdAt' | 'tone'>
export type NewWish = Omit<Wish, 'id' | 'createdAt' | 'completedAt' | 'completionPhotoId'>
export type NewGift = Omit<Gift, 'id'>
