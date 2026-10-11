import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { createCloudMock } from '../tests/cloudMock.ts'

const root = resolve('.tmp/pages-test-dist')
await new Promise((done, fail) => {
  const build = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', '.tmp/pages-test-dist'], {
    cwd: process.cwd(), windowsHide: true, stdio: 'inherit',
    env: { ...process.env, GITHUB_PAGES: 'true', VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_mock_only' },
  })
  build.on('error', fail)
  build.on('exit', code => code === 0 ? done() : fail(new Error(`Build failed: ${code}`)))
})
// A strict static server: no SPA rewrite. This tests the Pages hash URL strategy.
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const file = resolve(root, pathname.slice('/loveapp/'.length) || 'index.html')
  if (!pathname.startsWith('/loveapp/') || !file.startsWith(root + sep)) { response.writeHead(404).end(); return }
  try {
    const body = await readFile(file)
    response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] ?? 'application/octet-stream')
    response.end(body)
  } catch { response.writeHead(404).end() }
})
await new Promise(done => server.listen(4180, '127.0.0.1', done))
let browser
const errors = [], checks = []
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, env: { ...process.env, TEMP: resolve('.tmp'), TMP: resolve('.tmp') } })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const backend = createCloudMock()
  await backend.attach(page)
  await page.goto('http://127.0.0.1:4180/loveapp/')
  await page.getByLabel('邮箱', { exact: true }).fill('ruohan@example.test')
  await page.getByLabel('密码', { exact: true }).fill('correct-password')
  await page.getByRole('button', { name: '回到我们的小世界' }).click()
  await expect(page.locator('.couple-names')).toHaveText('石若瀚张潋镕')
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/photos', '/letters', '/wishes', '/gifts', '/profile']) {
      const response = await page.goto(`http://127.0.0.1:4180/loveapp/#${path}`)
      if (response) expect(response.status()).toBe(200)
      await expect(page.locator('main h1')).toBeVisible()
      const refreshed = await page.reload()
      expect(refreshed.status()).toBe(200)
      await expect(page.locator('main h1')).toBeVisible()
      expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true)
      for (const img of await page.locator('img.avatar').all()) {
        await expect.poll(() => img.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true)
        await expect(img).toHaveAttribute('src', /^\/loveapp\/images\//)
      }
      checks.push(`${width}px #${path}: content + refresh 200 + no overflow + avatars`)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('navigation', { name: '手机导航' }).getByRole('link', { name: '照片', exact: true }).click()
  await expect(page).toHaveURL(/\/loveapp\/#\/photos$/)
  await page.getByRole('button', { name: '上传照片', exact: true }).click()
  await page.getByLabel('选择本地图片').setInputFiles('tests/fixtures/flowers.jpg')
  await page.getByLabel('图片 1 描述').fill('Pages 路由测试')
  await page.getByRole('button', { name: /保存照片/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '查看照片：Pages 路由测试' }).click()
  await expect(page).toHaveURL(/#\/photos\?photo=/)
  await expect(page.locator('.lightbox-image img')).toBeVisible()
  await page.reload()
  await expect(page.locator('.lightbox-image img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  checks.push('Hash navigation, upload, photo query parameter, lightbox refresh and close')
  expect(errors).toEqual([])
  await writeFile('docs/github-pages-tests.json', JSON.stringify({ at: new Date().toISOString(), checks, errors, scope: 'Production-mode /loveapp/ hash build, strict local static server, mocked Supabase. Not public GitHub hosting or live-cloud verification.' }, null, 2) + '\n')
  console.log(`PASS ${checks.length} GitHub Pages compatibility checks`)
} finally {
  await browser?.close()
  await new Promise(done => server.close(done))
}
