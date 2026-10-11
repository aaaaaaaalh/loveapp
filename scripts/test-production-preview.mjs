import { chromium, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'chrome', headless: true, env: { ...process.env, TEMP: resolve('.tmp'), TMP: resolve('.tmp') } })
const errors = []
const checks = []
try {
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/photos', '/letters', '/wishes', '/gifts', '/profile']) {
      const response = await page.goto(`http://127.0.0.1:4173${path}`)
      expect(response.status()).toBe(200)
      await expect(page.getByRole('heading', { name: '欢迎回到我们的小世界' })).toBeVisible()
      expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true)
      await page.reload()
      await expect(page.getByRole('heading', { name: '欢迎回到我们的小世界' })).toBeVisible()
      checks.push(`${width}px ${path}: built app login guard + refresh + no overflow`)
    }
  }
  expect(errors).toEqual([])
  await writeFile('docs/deployment-preview-results.json', JSON.stringify({ at: new Date().toISOString(), checks, errors, scope: 'Local Vite production build preview, not Vercel routing or public HTTPS. No real user data modified.' }, null, 2) + '\n')
  console.log(`PASS ${checks.length} production preview cases; no browser errors`)
} finally { await browser.close() }
