import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const ref = process.argv[2]
if (!/^[a-z]{20}$/.test(ref ?? '')) throw new Error('Pass the explicitly approved project reference.')
const root = resolve(import.meta.dirname, '..')
const env = await readFile(resolve(root, '.env.local'), 'utf8')
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1].trim()
const publishable = env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1].trim()
assert.equal(url, `https://${ref}.supabase.co`)
assert.equal((await readFile(resolve(root, 'supabase/.temp/project-ref'), 'utf8')).trim(), ref)
const run = promisify(execFile)
let keys
try {
  const { stdout } = await run(process.execPath, ['scripts/supabase.mjs', 'projects', 'api-keys', '--project-ref', ref, '--reveal', '--output', 'json'], { cwd: root, windowsHide: true })
  keys = JSON.parse(stdout)
} catch { throw new Error('Cannot acquire the authorized test admin key; no key output is logged.') }
const adminKey = keys.find(key => key.type === 'secret')?.api_key ?? keys.find(key => key.name === 'service_role')?.api_key
assert.ok(adminKey, 'An admin key is needed only in this test process, never in the frontend.')
let transportPage
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
  // Use Chrome's working network path for live QA when Node's proxy resets connections.
  if (transportPage && !transportPage.isClosed() && new Headers(init?.headers).get('apikey') !== adminKey) {
    const result = await transportPage.evaluate(async ({ url, method, headers, body }) => {
      const response = await fetch(url, { method, headers, body })
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return { status: response.status, headers: Object.fromEntries(response.headers), body: globalThis.btoa(binary) }
    }, { url: String(input), method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers)), body: init?.body ?? undefined })
    return new Response([204, 205, 304].includes(result.status) ? null : Buffer.from(result.body, 'base64'), { status: result.status, headers: result.headers })
  }
  try { return await fetch(input, init) } catch (error) {
    console.error(`Network failure: ${init?.method ?? 'GET'} ${new URL(String(input)).pathname} ${error.cause?.code ?? error.message}`)
    throw error
  }
} } }
const admin = createClient(url, adminKey, options)
const anon = createClient(url, publishable, options)
const cleanupOnly = process.argv.includes('--cleanup')
const previous = cleanupOnly ? JSON.parse(await readFile(resolve(root, '.tmp/live-qa-owned.json'), 'utf8')) : null
if (previous) assert.equal(previous.ref, ref)
const runId = previous?.runId ?? `loveapp-qa-${Date.now()}`
const users = previous?.users.map(id => ({ id })) ?? []
const spaces = previous?.spaces ?? []
const checks = []
const errors = []
const connectionWarnings = []
const secrets = [adminKey, publishable]
let browser
let failure
const sanitize = text => secrets.filter(Boolean).reduce((value, secret) => value.replaceAll(secret, '[REDACTED]'), String(text))
const pass = name => { checks.push(name); console.log(`PASS ${name}`) }
function ok(result) { if (result.error) throw new Error(result.error.message); return result.data }
async function journal() { await writeFile(resolve(root, '.tmp/live-qa-owned.json'), JSON.stringify({ ref, runId, users: users.map(u => u.id), spaces }), 'utf8') }
async function login(page, user) {
  await page.goto('/')
  await page.getByLabel('邮箱', { exact: true }).fill(user.email)
  await page.getByLabel('密码', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: '回到我们的小世界' }).click()
  await expect(page.getByRole('heading', { name: '把「我」和「你」，变成「我们」' })).toBeVisible({ timeout: 30000 })
}
async function nav(page, name) {
  await page.getByRole('navigation', { name: page.viewportSize().width < 768 ? '手机导航' : '主导航' }).getByRole('link', { name, exact: true }).click()
}
async function closed(page) { await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30000 }) }
async function pageFor(user) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai', locale: 'zh-CN', reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  page.on('pageerror', error => errors.push(sanitize(error.message)))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = sanitize(message.text())
    // Rapid full navigations can abort a WebSocket handshake. Record this
    // separately and require a recovered live connection before finishing.
    if (/WebSocket connection.*ERR_CONNECTION_CLOSED/.test(text)) connectionWarnings.push(text)
    else errors.push(text)
  })
  await login(page, user)
  return page
}
try {
  await mkdir(resolve(root, '.tmp'), { recursive: true })
  await mkdir(resolve(root, 'docs/qa'), { recursive: true })
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  let proxy
  if (proxyUrl) {
    const parsed = new URL(proxyUrl)
    proxy = { server: `${parsed.protocol}//${parsed.host}`, bypass: 'localhost,127.0.0.1', username: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password) }
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true, proxy, env: { ...process.env, TEMP: resolve(root, '.tmp'), TMP: resolve(root, '.tmp') } })
  transportPage = await browser.newPage()
  await transportPage.goto('http://127.0.0.1:5173/')
  if (!cleanupOnly) {
  await journal()
  const registrationPage = await browser.newPage()
  await registrationPage.goto('http://127.0.0.1:5173/')
  for (const suffix of ['a', 'b', 'outside']) {
    const email = `${runId}-${suffix}@example.test`
    const password = randomBytes(24).toString('base64url')
    secrets.push(password)
    const { user, session } = await registrationPage.evaluate(async ({ url, publishable, email, password, runId }) => {
      const response = await fetch(`${url}/auth/v1/signup`, { method: 'POST', headers: { apikey: publishable, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { loveapp_qa_run: runId } }) })
      const data = await response.json()
      if (!response.ok) throw new Error(`Registration failed (${response.status}): ${data.msg ?? data.message ?? data.error_code}`)
      return { user: { id: data.user.id }, session: Boolean(data.access_token) }
    }, { url, publishable, email, password, runId })
    users.push({ id: user.id, email, password })
    await journal()
    assert.ok(session, 'Direct registration must return a session without confirmation email.')
  }
  await registrationPage.close()
  pass('真实公开注册创建三个临时账号，直接获得登录会话，无需确认邮件')
  const a = await pageFor(users[0])
  await a.getByRole('button', { name: '创建我们的小世界', exact: true }).click()
  await expect(a.locator('.couple-names')).toHaveText('石若瀚张潋镕', { timeout: 30000 })
  spaces.push(ok(await admin.from('space_members').select('space_id').eq('user_id', users[0].id).single()).space_id)
  await journal()
  await nav(a, '我的')
  await a.getByRole('button', { name: '生成邀请码', exact: true }).click()
  await expect(a.getByLabel('邀请码', { exact: true })).toHaveValue(/^[a-f0-9]{64}$/)
  const invitation = await a.getByLabel('邀请码', { exact: true }).inputValue()
  secrets.push(invitation)
  const b = await pageFor(users[1])
  await b.getByRole('button', { name: '加入对方的空间', exact: true }).click()
  await b.getByLabel('对方的邀请码').fill(invitation)
  await b.getByRole('button', { name: '加入我们的小世界', exact: true }).click()
  await expect(b.locator('.couple-names')).toHaveText('张潋镕石若瀚', { timeout: 30000 })
  await expect(a.getByText(/2 \/ 2 位成员/)).toBeVisible({ timeout: 30000 })
  pass('两个独立浏览器真实登录、创建空间、邀请加入和身份映射')
  const clients = []
  for (const user of users) {
    const client = createClient(url, publishable, options)
    ok(await client.auth.signInWithPassword({ email: user.email, password: user.password }))
    clients.push(client)
  }
  spaces.push(ok(await clients[2].rpc('create_space', { p_my_name: '隔离测试', p_partner_name: '测试对方', p_start_date: null })))
  await journal()
  await nav(a, '留言')
  await nav(b, '留言')
  await b.getByRole('button', { name: '写一条留言' }).click()
  await b.getByLabel('想说的话').fill('临时云端验收留言')
  await b.getByRole('button', { name: '发布留言', exact: true }).click()
  await closed(b)
  await expect(a.locator('.letter-card')).toContainText('临时云端验收留言', { timeout: 30000 })
  await a.reload()
  await expect(a.locator('.letter-card')).toContainText('临时云端验收留言', { timeout: 30000 })
  await expect(a.locator('.site-footer').getByText(/实时同步已连接/)).toBeAttached({ timeout: 30000 })
  pass('真实留言持久保存、刷新恢复和跨会话同步，Realtime 已连接')
  await nav(a, '照片')
  await a.getByRole('button', { name: '上传照片', exact: true }).click()
  await a.getByLabel('选择本地图片').setInputFiles(resolve(root, 'tests/fixtures/flowers.jpg'))
  await a.getByLabel('图片 1 描述').fill('临时云端验收照片')
  await a.getByRole('button', { name: /保存照片/ }).click()
  await closed(a)
  await a.reload()
  await expect(a.locator('.photo-card')).toHaveCount(1, { timeout: 30000 })
  await a.getByRole('button', { name: '查看照片：临时云端验收照片' }).click()
  await expect(a.locator('.lightbox-image img')).toBeVisible()
  await expect.poll(() => a.locator('.lightbox-image img').evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 30000 }).toBe(true)
  await expect(a.locator('.lightbox-image img')).toHaveAttribute('src', /\/storage\/v1\/object\/sign\/loveapp-photos\//)
  await a.keyboard.press('Escape')
  await nav(b, '照片')
  await expect(b.locator('.photo-card')).toHaveCount(1, { timeout: 30000 })
  pass('真实私有照片上传、刷新大图读取和对方可见')
  const photo = ok(await clients[0].from('photos').select('*').eq('space_id', spaces[0]).single())
  assert.equal(ok(await clients[2].from('photos').select('*').eq('space_id', spaces[0])).length, 0)
  assert.ok([400, 401, 403, 404].includes(Number((await clients[2].storage.from('loveapp-photos').download(photo.storage_path)).error?.statusCode)))
  assert.ok([400, 401, 403, 404].includes(Number((await anon.storage.from('loveapp-photos').download(photo.storage_path)).error?.statusCode)))
  const publicResponse = await options.global.fetch(`${url}/storage/v1/object/public/loveapp-photos/${photo.storage_path}`)
  assert.equal(publicResponse.ok, false)
  for (const table of ['spaces', 'space_members', 'photos', 'letters', 'wishes', 'gifts']) {
    assert.ok([401, 403].includes((await anon.from(table).select('*')).status), `Anonymous cannot read ${table}`)
    const column = table === 'spaces' ? 'id' : 'space_id'
    assert.equal(ok(await clients[2].from(table).select('*').eq(column, spaces[0])).length, 0)
  }
  assert.equal((await clients[2].from('letters').insert({ space_id: spaces[0], author_id: users[2].id, content: '越权测试' })).error?.code, '42501')
  assert.equal((await clients[0].from('letters').insert({ space_id: spaces[0], author_id: users[1].id, content: '冒名测试' })).error?.code, '42501')
  assert.ok((await clients[0].rpc('create_space_invite', { p_space_id: spaces[0] })).error)
  pass('真实匿名拒绝、跨空间六表隔离、越权写入与冒名拒绝、两人上限、私有文件访问控制')
  await nav(a, '愿望')
  await a.getByRole('button', { name: '添加愿望', exact: true }).click()
  await a.getByLabel('愿望标题').fill('临时验收愿望')
  await a.getByRole('button', { name: '加入愿望清单' }).click()
  await closed(a)
  const createdWish = ok(await clients[0].from('wishes').select('id,title').eq('space_id', spaces[0]).single())
  assert.equal(ok(await clients[2].from('wishes').update({ title: '越权修改' }).eq('id', createdWish.id).select('id')).length, 0)
  assert.equal(ok(await clients[2].from('wishes').delete().eq('id', createdWish.id).select('id')).length, 0)
  await a.getByLabel('修改愿望状态：临时验收愿望').selectOption('done')
  await expect(a.locator('.wish-card')).toHaveClass(/wish-done/)
  await nav(b, '愿望')
  await expect(b.locator('.wish-card')).toHaveClass(/wish-done/, { timeout: 30000 })
  await a.reload()
  await expect(a.locator('.wish-card')).toHaveClass(/wish-done/, { timeout: 30000 })
  await a.getByRole('button', { name: '编辑愿望：临时验收愿望' }).click()
  await a.getByLabel('愿望标题').fill('已编辑的临时愿望')
  await a.getByRole('button', { name: '保存本次修改' }).click()
  await closed(a)
  await a.getByRole('button', { name: '删除愿望：已编辑的临时愿望' }).click()
  await a.getByRole('button', { name: '确认删除' }).click()
  await closed(a)
  await expect(b.locator('.wish-card')).toHaveCount(0, { timeout: 30000 })
  pass('真实愿望新增、编辑、完成、刷新恢复、删除及双方同步')
  await a.getByRole('navigation', { name: '愿望类型' }).getByRole('link', { name: '想要的礼物' }).click()
  await a.getByRole('button', { name: '添加礼物', exact: true }).click()
  await a.getByLabel('礼物名称').fill('临时验收礼物')
  await a.getByRole('button', { name: '加入礼物心愿' }).click()
  await closed(a)
  await a.reload()
  await expect(a.locator('.gift-card')).toContainText('临时验收礼物', { timeout: 30000 })
  const createdGift = ok(await clients[0].from('gifts').select('id').eq('space_id', spaces[0]).single())
  assert.equal(ok(await clients[2].from('gifts').update({ name: '越权修改' }).eq('id', createdGift.id).select('id')).length, 0)
  assert.equal(ok(await clients[2].from('gifts').delete().eq('id', createdGift.id).select('id')).length, 0)
  await a.getByRole('button', { name: '编辑礼物：临时验收礼物' }).click()
  await a.getByLabel('礼物名称').fill('已编辑的临时礼物')
  await a.getByRole('button', { name: '保存本次修改' }).click()
  await closed(a)
  await a.getByRole('button', { name: '删除礼物：已编辑的临时礼物' }).click()
  await a.getByRole('button', { name: '确认删除' }).click()
  await closed(a)
  await expect(a.locator('.gift-card')).toHaveCount(0)
  pass('真实礼物新增、编辑、刷新恢复和删除')
  await nav(a, '我的')
  await a.getByRole('button', { name: '编辑我们的信息' }).click()
  await a.getByLabel('我的昵称').fill('验收昵称')
  await a.getByRole('button', { name: '保存信息', exact: true }).click()
  await closed(a)
  await nav(b, '我的')
  await expect(b.locator('.profile-main-card h2')).toHaveText('张潋镕&验收昵称', { timeout: 30000 })
  await a.reload()
  await expect(a.locator('.profile-main-card h2')).toHaveText('验收昵称&张潋镕', { timeout: 30000 })
  pass('真实个人资料持久保存与双方身份正确同步')
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await a.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/photos', '/letters', '/wishes', '/gifts', '/profile']) {
      await a.goto(path)
      await expect(a.locator('main h1')).toBeVisible({ timeout: 30000 })
      assert.equal(await a.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true, `${path} ${width}px`)
    }
  }
  pass('真实云端六页 × 六种宽度访问、刷新与无横向溢出')
  await expect(a.locator('.site-footer').getByText(/实时同步已连接/)).toBeAttached({ timeout: 30000 })
  await a.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(a.getByRole('heading', { name: '欢迎回到我们的小世界' })).toBeVisible()
  await a.reload()
  await expect(a.getByRole('heading', { name: '欢迎回到我们的小世界' })).toBeVisible()
  assert.deepEqual(errors, [])
  await a.setViewportSize({ width: 390, height: 844 })
  await a.screenshot({ path: resolve(root, 'docs/qa/cloud-live-login-390.png') })
  pass('真实退出清理、刷新保持退出、浏览器无严重错误')
  }
} catch (error) {
  failure = sanitize(error.message)
  console.error(`FAIL ${failure}`)
  process.exitCode = 1
} finally {
  try {
    // Only resources owned by this run's explicitly recorded temporary users.
    const verifiedUsers = ok(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).users
    for (const user of users) {
      const verified = verifiedUsers.find(item => item.id === user.id)
      if (!verified) continue
      assert.equal(verified.app_metadata.loveapp_qa_run ?? verified.user_metadata.loveapp_qa_run, runId)
      assert.ok(verified.email.startsWith(`${runId}-`))
      const owned = ok(await admin.from('spaces').select('id').eq('created_by', user.id))
      for (const space of owned) {
        const photos = ok(await admin.from('photos').select('storage_path').eq('space_id', space.id))
        if (photos.length) ok(await admin.storage.from('loveapp-photos').remove(photos.map(p => p.storage_path)))
        ok(await admin.from('spaces').delete().eq('id', space.id).eq('created_by', user.id))
      }
    }
    for (const user of users.filter(user => verifiedUsers.some(item => item.id === user.id))) ok(await admin.auth.admin.deleteUser(user.id))
    pass('已清理本次临时账号、测试空间与照片；未清空已有用户数据')
  } catch (error) { failure = `${failure ?? ''}\nCleanup: ${sanitize(error.message)}`; process.exitCode = 1; console.error(`Cleanup requires review: ${sanitize(error.message)}; owned IDs remain in the ignored journal.`) }
  await browser?.close()
  await writeFile(resolve(root, 'docs/cloud-live-results.json'), JSON.stringify({ at: new Date().toISOString(), projectRef: ref, passed: checks, failure: failure ?? null, browserErrors: errors, connectionWarnings, emailDeliveryTested: false }, null, 2), 'utf8')
}
