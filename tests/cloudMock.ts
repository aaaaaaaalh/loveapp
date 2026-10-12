import type { Page, WebSocketRoute } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

type Row = Record<string, unknown>
type Binding = { id: number; table: string; event: string; schema: string; filter: string }
const ids = { me: '11111111-1111-4111-8111-111111111111', partner: '22222222-2222-4222-8222-222222222222' }
const origin = 'http://127.0.0.1:54321'

export function createCloudMock(ready = true, paired = true) {
  const spaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const rows: Record<string, Row[]> = {
    spaces: ready ? [{ id: spaceId, name_a: '石若瀚', name_b: '张潋镕', start_date: '2026-04-20' }] : [],
    space_members: ready ? [{ space_id: spaceId, user_id: ids.me, slot: 0, is_active: true }, ...(paired ? [{ space_id: spaceId, user_id: ids.partner, slot: 1, is_active: true }] : [])] : [],
    photos: [], letters: [], wishes: [], gifts: []
  }
  const files = new Set<string>()
  const sockets = new Map<WebSocketRoute, { joinRef: string; topic: string; filters: Binding[] }>()
  const requests: { path: string; method: string; body: Row; userId: string }[] = []
  let failure = ''
  let release: (() => void) | undefined
  let held: Promise<void> | undefined
  let invite = ''
  const user = (id: string) => ({ id, aud: 'authenticated', role: 'authenticated', email: id === ids.me ? 'ruohan@example.test' : 'partner@example.test', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: new Date().toISOString() })
  const session = (id: string) => ({ access_token: `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.local_test_signature`, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `local-refresh-${id}`, user: user(id) })
  const broadcast = (table: string, record: Row, type = 'UPDATE') => {
    for (const [socket, binding] of sockets) {
      const filters = binding.filters.filter(filter => filter.table === table)
      if (!filters.length) continue
      socket.send(JSON.stringify([binding.joinRef, null, binding.topic, 'postgres_changes', { ids: filters.map(filter => filter.id), data: { schema: 'public', table, type, commit_timestamp: new Date().toISOString(), columns: [], record, old_record: {} } }]))
    }
  }
  const attach = async (page: Page) => {
    await page.routeWebSocket('ws://127.0.0.1:54321/**', socket => {
      socket.onMessage(message => {
        if (typeof message !== 'string') return
        const [joinRef, ref, topic, event, payload] = JSON.parse(message) as [string, string, string, string, { config?: { postgres_changes: Omit<Binding, 'id'>[] } }]
        if (event === 'phx_join') {
          const filters = (payload.config?.postgres_changes ?? []).map((filter, index) => ({ ...filter, id: index + 1 }))
          sockets.set(socket, { joinRef, topic, filters })
          socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: filters } }]))
        } else if (event === 'heartbeat' || event === 'phx_leave') {
          socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]))
          if (event === 'phx_leave') sockets.delete(socket)
        }
      })
      socket.onClose(() => sockets.delete(socket))
    })
    await page.route(`${origin}/**`, async route => {
      const request = route.request()
      const url = new URL(request.url())
      const path = url.pathname
      const method = request.method()
      const body = request.headers()['content-type']?.includes('application/json') && request.postData() ? request.postDataJSON() as Row : {}
      let userId = ''
      const token = request.headers().authorization?.replace('Bearer ', '')
      try { userId = (JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString()) as { sub: string }).sub } catch { /* publishable key or no session */ }
      requests.push({ path, method, body, userId })
      const reply = async (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', json: data })
      const error = async (message: string, status = 400) => reply({ message, msg: message, code: 'mock_error' }, status)
      if (method === 'OPTIONS') { await reply({}); return }
      if (path === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'refresh_token') { await reply(session(String(body.refresh_token).includes(ids.partner) ? ids.partner : ids.me)); return }
        if (body.password !== 'correct-password') { await error('Invalid login credentials'); return }
        await reply(session(body.email === 'partner@example.test' ? ids.partner : ids.me)); return
      }
      if (path === '/auth/v1/user') { await reply(user(userId)); return }
      if (path === '/auth/v1/signup') { await reply({ user: user(ids.me), session: null }); return }
      if (path === '/auth/v1/logout') { await reply({}); return }
      if (!userId && !path.includes('/object/sign/')) { await error('请先登录。', 401); return }
      if (failure && method !== 'GET' && path.includes(failure)) { failure = ''; await error('保存失败，请重试。', 500); return }
      if (held && method === 'POST' && path === '/rest/v1/letters') await held
      if (path.startsWith('/rest/v1/rpc/')) {
        const rpc = path.split('/').at(-1)
        if (rpc === 'my_spaces') {
          await reply(rows.space_members.filter(m => m.user_id === userId).map(m => ({ ...rows.spaces.find(s => s.id === m.space_id), ...m }))); return
        }
        if (rpc === 'switch_space') {
          if (!rows.space_members.some(m => m.user_id === userId && m.space_id === body.p_space_id)) { await error('你还没有加入这个空间。'); return }
          rows.space_members.filter(m => m.user_id === userId).forEach(m => { m.is_active = m.space_id === body.p_space_id })
          await reply(null); return
        }
        if (rpc === 'create_space') {
          rows.spaces = [{ id: spaceId, name_a: body.p_my_name, name_b: body.p_partner_name, start_date: body.p_start_date }]
          rows.space_members = [{ space_id: spaceId, user_id: userId, slot: 0, is_active: true }]
          await reply(spaceId); return
        }
        if (rpc === 'create_space_invite') { invite = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''); await reply(invite); return }
        if (rpc === 'join_space') {
          if (!invite || body.p_code !== invite || rows.space_members.filter(m => m.space_id === spaceId).length >= 2) { await error('邀请码无效或已经使用，请让对方重新生成。'); return }
          rows.space_members.filter(m => m.user_id === userId).forEach(m => { m.is_active = false })
          rows.space_members.push({ space_id: spaceId, user_id: userId, slot: 1, is_active: true })
          rows.spaces[0].name_b = body.p_nickname
          invite = ''
          await reply(spaceId)
          broadcast('space_members', rows.space_members[1], 'INSERT'); return
        }
        if (rpc === 'update_space_profile') {
          const mine = rows.space_members.find(member => member.user_id === userId)
          rows.spaces[0].name_a = mine?.slot === 0 ? body.p_my_name : body.p_partner_name
          rows.spaces[0].name_b = mine?.slot === 0 ? body.p_partner_name : body.p_my_name
          rows.spaces[0].start_date = body.p_start_date
          await reply(null); broadcast('spaces', rows.spaces[0]); return
        }
      }
      if (path.startsWith('/rest/v1/')) {
        const table = path.split('/').at(-1)!
        if (!rows[table]) { await error('Could not find the table in the schema cache', 404); return }
        const matches = (row: Row) => [...url.searchParams.entries()].filter(([, value]) => value.startsWith('eq.')).every(([key, value]) => String(row[key]) === value.slice(3))
        const isMember = rows.space_members.some(member => member.user_id === userId)
        let result: Row[] = []
        if (method === 'GET') result = isMember ? rows[table].filter(matches) : []
        if (method === 'POST') {
          const input = request.postDataJSON() as Row | Row[]
          result = (Array.isArray(input) ? input : [input]).map(row => ({ id: randomUUID(), created_at: new Date().toISOString(), completed_at: null, completion_photo_id: null, ...row }))
          rows[table].unshift(...result)
        }
        if (method === 'PATCH') {
          result = rows[table].filter(matches)
          for (const row of result) Object.assign(row, body)
        }
        if (method === 'DELETE') { result = rows[table].filter(matches); rows[table] = rows[table].filter(row => !matches(row)) }
        const objectResponse = request.headers().accept?.includes('application/vnd.pgrst.object+json')
        await reply(objectResponse ? result[0] ?? null : result)
        if (method === 'POST' || method === 'PATCH') for (const row of result) broadcast(table, row, method === 'POST' ? 'INSERT' : 'UPDATE')
        return
      }
      if (path === '/storage/v1/object/sign/loveapp-photos' && method === 'POST') {
        await reply((body.paths as string[]).map(item => ({ path: item, signedURL: `/object/sign/loveapp-photos/${item}?token=local-test`, error: null }))); return
      }
      if (path.startsWith('/storage/v1/object/sign/') && method === 'GET') { await route.fulfill({ contentType: 'image/jpeg', body: await readFile('tests/fixtures/flowers.jpg') }); return }
      if (path.startsWith('/storage/v1/object/loveapp-photos/') && method === 'POST') {
        const item = path.slice('/storage/v1/object/loveapp-photos/'.length)
        files.add(item)
        await reply({ Key: `loveapp-photos/${item}`, Id: randomUUID() }); return
      }
      if (path === '/storage/v1/object/loveapp-photos' && method === 'DELETE') {
        for (const item of body.prefixes as string[]) files.delete(item)
        await reply((body.prefixes as string[]).map(name => ({ name }))); return
      }
      await error(`Unexpected mock request: ${method} ${path}`, 404)
    })
  }
  return { attach, rows, files, requests, ids, spaceId, broadcast,
    failNext: (path: string) => { failure = path },
    holdLetters: () => { held = new Promise<void>(resolve => { release = resolve }) },
    releaseLetters: () => { release?.(); held = undefined }
  }
}
