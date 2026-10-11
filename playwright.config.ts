import { defineConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Keep browser test temporary files inside the only project workspace.
const tempDirectory = resolve('.tmp')
mkdirSync(tempDirectory, { recursive: true })
process.env.TEMP = tempDirectory
process.env.TMP = tempDirectory

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  expect: { timeout: 8_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    headless: true,
    actionTimeout: 10_000,
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'Asia/Shanghai',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'demo', testMatch: '**/space.spec.ts', use: { baseURL: 'http://127.0.0.1:5176' } },
    { name: 'cloud-mock', testMatch: '**/cloud.spec.ts', use: { baseURL: 'http://127.0.0.1:5177' } }
  ],
  // Separate test servers ensure user configuration and real cloud records
  // cannot be touched by the demo or mocked-cloud browser tests.
  webServer: [
    { command: 'npm.cmd run dev -- --port 5176 --strictPort', url: 'http://127.0.0.1:5176', reuseExistingServer: true, timeout: 30_000, env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' } },
    { command: 'npm.cmd run dev -- --port 5177 --strictPort', url: 'http://127.0.0.1:5177', reuseExistingServer: true, timeout: 30_000, env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_mock_only' } }
  ]
})
