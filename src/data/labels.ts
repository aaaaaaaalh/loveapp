import type { GiftPriority, WishStatus } from '../types/domain'
export const statusLabels: Record<WishStatus, string> = { todo: '想做', planned: '计划中', done: '已完成' }
export const priorityLabels: Record<GiftPriority, string> = { high: '特别想要', medium: '有点心动', low: '随缘就好' }
