export interface SpaceRow { id: string; name_a: string; name_b: string; start_date: string | null }
export interface MemberRow { space_id: string; user_id: string; slot: 0 | 1 }
export interface PhotoRow { id: string; space_id: string; author_id: string; storage_path: string; description: string; photo_date: string; ratio: number }
export interface LetterRow { id: string; author_id: string; content: string; created_at: string; tone: 'rose' | 'cream' | 'sage' }
export interface WishRow { id: string; author_id: string; title: string; description: string; status: 'todo' | 'planned' | 'done'; created_at: string; completed_at: string | null; completion_photo_id: string | null }
export interface GiftRow { id: string; owner_id: string; name: string; image: string; price: number | null; link: string; note: string; priority: 'high' | 'medium' | 'low' }
