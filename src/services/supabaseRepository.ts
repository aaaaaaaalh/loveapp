import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceRepository } from './spaceRepository'
import type { SpaceData, PersonId, Wish, NewWish, NewGift } from '../types/domain'
import type { SpaceRow, MemberRow, PhotoRow, LetterRow, WishRow, GiftRow } from '../types/database'
import { mockData } from '../data/mockData'
import { localDateString } from '../utils/date'
import { readableError } from '../utils/errors'

const bucket = 'loveapp-photos'
const tables = ['spaces', 'space_members', 'photos', 'letters', 'wishes', 'gifts'] as const

export function createSupabaseRepository(client: SupabaseClient, membership: MemberRow, onSync: (status: string, error: string) => void) {
  let data: SpaceData = structuredClone(mockData)
  let members: MemberRow[] = []
  let disposed = false
  let realtimeConnected = false
  let currentLoad: Promise<void> | null = null
  let reloadAgain = false
  let timer: number | undefined
  const listeners = new Set<() => void>()
  const previewUrls = new Set<string>()
  const signedUrls = new Map<string, { url: string; expires: number }>()
  const { space_id: spaceId, user_id: userId, slot } = membership
  const ensureActive = () => { if (disposed) throw new Error('登录状态已经改变，请重新打开页面。') }
  const emit = (next: SpaceData) => { if (!disposed) { data = next; listeners.forEach(listener => listener()) } }
  const person = (id: string): PersonId => id === userId ? 'me' : 'partner'
  const ownerId = (person: PersonId) => {
    const id = person === 'me' ? userId : members.find(member => member.user_id !== userId)?.user_id
    if (!id) throw new Error('请先邀请对方加入空间，再为对方添加礼物。')
    return id
  }
  const mapLetter = (row: LetterRow) => ({ id: row.id, author: person(row.author_id), content: row.content, createdAt: row.created_at, tone: row.tone })
  const mapWish = (row: WishRow): Wish => ({ id: row.id, author: person(row.author_id), title: row.title, description: row.description, status: row.status, createdAt: row.created_at, completedAt: row.completed_at ?? undefined, completionPhotoId: row.completion_photo_id ?? undefined })
  const mapGift = (row: GiftRow) => ({ id: row.id, owner: person(row.owner_id), name: row.name, image: row.image, price: row.price === null ? null : Number(row.price), link: row.link, note: row.note, priority: row.priority })

  async function read() {
    ensureActive()
    const results = await Promise.all([
      client.from('spaces').select('id,name_a,name_b,start_date').eq('id', spaceId).single<SpaceRow>(),
      client.from('space_members').select('space_id,user_id,slot').eq('space_id', spaceId).returns<MemberRow[]>(),
      client.from('photos').select('*').eq('space_id', spaceId).order('photo_date', { ascending: false }).returns<PhotoRow[]>(),
      client.from('letters').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).returns<LetterRow[]>(),
      client.from('wishes').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).returns<WishRow[]>(),
      client.from('gifts').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).returns<GiftRow[]>()
    ])
    for (const result of results) if (result.error) throw result.error
    ensureActive()
    const [spaceResult, memberResult, photosResult, lettersResult, wishesResult, giftsResult] = results
    const space = spaceResult.data!
    const rows = photosResult.data!
    const needed = rows.map(row => row.storage_path).filter(path => !signedUrls.has(path) || signedUrls.get(path)!.expires < Date.now() + 60_000)
    if (needed.length) {
      const { data: links, error } = await client.storage.from(bucket).createSignedUrls(needed, 600)
      if (error) throw error
      for (const link of links ?? []) {
        if (link.error || !link.signedUrl || !link.path) throw new Error('照片地址暂时无法读取，请重试。')
        signedUrls.set(link.path, { url: link.signedUrl, expires: Date.now() + 600_000 })
      }
    }
    ensureActive()
    const myName = slot === 0 ? space.name_a : space.name_b
    const otherName = slot === 0 ? space.name_b : space.name_a
    members = memberResult.data!
    emit({
      profile: { startDate: space.start_date ?? '', people: {
        me: { id: 'me', name: myName, avatar: slot === 0 ? '/images/avatar-me.svg' : '/images/avatar-partner.svg' },
        partner: { id: 'partner', name: otherName, avatar: slot === 0 ? '/images/avatar-partner.svg' : '/images/avatar-me.svg' }
      } },
      photos: rows.map(row => ({ id: row.id, src: signedUrls.get(row.storage_path)!.url, description: row.description, date: row.photo_date, ratio: row.ratio, author: person(row.author_id) })),
      letters: lettersResult.data!.map(mapLetter), wishes: wishesResult.data!.map(mapWish), gifts: giftsResult.data!.map(mapGift)
    })
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    previewUrls.clear()
    for (const path of signedUrls.keys()) if (!rows.some(row => row.storage_path === path)) signedUrls.delete(path)
    onSync(realtimeConnected ? '实时同步已连接' : '已同步', '')
  }

  async function refresh() {
    if (disposed) return
    if (currentLoad) { reloadAgain = true; return currentLoad }
    currentLoad = (async () => {
      do { reloadAgain = false; await read() } while (reloadAgain && !disposed)
    })().finally(() => { currentLoad = null })
    return currentLoad
  }
  const backgroundRefresh = () => { void refresh().catch(error => { if (!disposed) onSync('连接暂时中断', readableError(error)) }) }
  const afterWrite = async () => {
    // The server already confirmed the write. A subsequent refresh failure
    // must not misrepresent it as an unsuccessful save.
    try { await refresh() } catch (error) { if (!disposed) onSync('已保存，等待同步', readableError(error)) }
  }
  const channel = client.channel(`space:${spaceId}:${userId}`)
  for (const table of tables) channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `${table === 'spaces' ? 'id' : 'space_id'}=eq.${spaceId}` }, backgroundRefresh)

  const wishFields = (wish: NewWish & Pick<Wish, 'completedAt' | 'completionPhotoId'>) => ({ title: wish.title, description: wish.description, status: wish.status, completed_at: wish.status === 'done' ? wish.completedAt ?? localDateString() : null, completion_photo_id: wish.status === 'done' ? wish.completionPhotoId ?? null : null })
  const giftFields = (gift: NewGift) => ({ name: gift.name, image: gift.image, price: gift.price, link: gift.link, note: gift.note, priority: gift.priority, owner_id: ownerId(gift.owner) })

  const repository: SpaceRepository & { initialize(): Promise<void>; refresh(): Promise<void>; getMemberCount(): number } = {
    getSnapshot: () => data,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getMemberCount: () => members.length,
    refresh,
    initialize: async () => {
      await refresh()
      ensureActive()
      channel.subscribe(status => {
        if (disposed) return
        if (status === 'SUBSCRIBED') { realtimeConnected = true; onSync('实时同步已连接', ''); backgroundRefresh() }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { realtimeConnected = false; onSync('正在自动刷新', '实时连接暂时不可用，仍会定期同步。') }
      })
      // Postgres DELETE filters are limited; polling also covers deletion,
      // reconnects, private URL renewal and missed membership changes.
      timer = window.setInterval(backgroundRefresh, 15_000)
      window.addEventListener('focus', backgroundRefresh)
    },
    updateProfile: async profile => {
      ensureActive()
      const { error } = await client.rpc('update_space_profile', { p_space_id: spaceId, p_my_name: profile.people.me.name, p_partner_name: profile.people.partner.name, p_start_date: profile.startDate || null })
      if (error) throw error
      emit({ ...data, profile })
      await afterWrite()
    },
    addPhotos: async photos => {
      ensureActive()
      const uploaded: string[] = []
      const rows: { space_id: string; author_id: string; storage_path: string; description: string; photo_date: string; ratio: number }[] = []
      let saved = false
      try {
        for (const photo of photos) {
          ensureActive()
          if (!photo.local || !photo.src.startsWith('blob:')) throw new Error('请选择本地图片文件。')
          const blob = await (await fetch(photo.src)).blob()
          const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
          const extension = extensions[blob.type]
          if (!extension || blob.size > 12 * 1024 * 1024) throw new Error('请选择不超过 12 MB 的图片。')
          const path = `${spaceId}/${userId}/${crypto.randomUUID()}.${extension}`
          const { error } = await client.storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false })
          if (error) throw error
          uploaded.push(path)
          rows.push({ space_id: spaceId, author_id: userId, storage_path: path, description: photo.description, photo_date: photo.date, ratio: photo.ratio })
        }
        ensureActive()
        const { data: records, error } = await client.from('photos').insert(rows).select('*').returns<PhotoRow[]>()
        if (error) throw error
        saved = true
        photos.forEach(photo => previewUrls.add(photo.src))
        emit({ ...data, photos: [...records!.map(row => ({ ...photos[rows.findIndex(item => item.storage_path === row.storage_path)], id: row.id, author: 'me' as const, local: false })), ...data.photos.filter(item => !records!.some(row => row.id === item.id))] })
        await afterWrite()
      } catch (error) {
        if (!saved && uploaded.length) {
          const { error: cleanupError } = await client.storage.from(bucket).remove(uploaded)
          if (cleanupError) throw new Error(`${readableError(error)} 部分未完成上传的文件未能清理，请稍后检查存储空间。`)
        }
        throw error
      }
    },
    addLetter: async letter => {
      ensureActive()
      const { data: row, error } = await client.from('letters').insert({ space_id: spaceId, author_id: userId, content: letter.content, tone: ['cream', 'rose', 'sage'][data.letters.length % 3] }).select('*').single<LetterRow>()
      if (error) throw error
      emit({ ...data, letters: [mapLetter(row!), ...data.letters.filter(item => item.id !== row!.id)] })
      await afterWrite()
    },
    saveWish: async (wish, id) => {
      ensureActive()
      const existing = data.wishes.find(item => item.id === id)
      const fields = wishFields({ ...wish, completedAt: existing?.completedAt, completionPhotoId: existing?.completionPhotoId })
      const request = id ? client.from('wishes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).eq('space_id', spaceId) : client.from('wishes').insert({ ...fields, space_id: spaceId, author_id: userId })
      const { data: row, error } = await request.select('*').single<WishRow>()
      if (error) throw error
      emit({ ...data, wishes: id ? data.wishes.map(item => item.id === id ? mapWish(row!) : item) : [mapWish(row!), ...data.wishes.filter(item => item.id !== row!.id)] })
      await afterWrite()
    },
    updateWish: async (id, patch) => {
      const existing = data.wishes.find(wish => wish.id === id)
      if (!existing) throw new Error('这条愿望已经被移除，请刷新列表。')
      ensureActive()
      const { data: row, error } = await client.from('wishes').update({ ...wishFields({ ...existing, ...patch }), updated_at: new Date().toISOString() }).eq('id', id).eq('space_id', spaceId).select('*').single<WishRow>()
      if (error) throw error
      emit({ ...data, wishes: data.wishes.map(wish => wish.id === id ? mapWish(row!) : wish) })
      await afterWrite()
    },
    deleteWish: async id => {
      ensureActive()
      const { error } = await client.from('wishes').delete().eq('id', id).eq('space_id', spaceId)
      if (error) throw error
      emit({ ...data, wishes: data.wishes.filter(wish => wish.id !== id) })
      await afterWrite()
    },
    saveGift: async (gift, id) => {
      ensureActive()
      const fields = giftFields(gift)
      const request = id ? client.from('gifts').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).eq('space_id', spaceId) : client.from('gifts').insert({ ...fields, space_id: spaceId, created_by: userId })
      const { data: row, error } = await request.select('*').single<GiftRow>()
      if (error) throw error
      emit({ ...data, gifts: id ? data.gifts.map(item => item.id === id ? mapGift(row!) : item) : [mapGift(row!), ...data.gifts.filter(item => item.id !== row!.id)] })
      await afterWrite()
    },
    updateGift: async (id, patch) => {
      const existing = data.gifts.find(gift => gift.id === id)
      if (!existing) throw new Error('这份礼物已经被移除，请刷新列表。')
      await repository.saveGift({ ...existing, ...patch }, id)
    },
    deleteGift: async id => {
      ensureActive()
      const { error } = await client.from('gifts').delete().eq('id', id).eq('space_id', spaceId)
      if (error) throw error
      emit({ ...data, gifts: data.gifts.filter(gift => gift.id !== id) })
      await afterWrite()
    },
    dispose: () => {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener('focus', backgroundRefresh)
      void client.removeChannel(channel)
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      previewUrls.clear()
      signedUrls.clear()
      listeners.clear()
      data = structuredClone(mockData)
      members = []
    }
  }
  return repository
}
