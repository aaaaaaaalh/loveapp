import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

// Direct child Node processes avoid Windows npm.cmd process-tree teardown
// issues. All test servers use this workspace and test-only configuration.
const cwd = process.cwd()
const servers = []
let runner
let cleaning = false
async function cleanup() {
  if (cleaning) return
  cleaning = true
  runner?.kill()
  for (const { child } of servers) child.kill()
  await Promise.all(servers.map(({ child }) => child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve))))
}
process.on('SIGINT', () => { void cleanup().finally(() => { process.exitCode = 130 }) })
process.on('SIGTERM', () => { void cleanup().finally(() => { process.exitCode = 143 }) })
try {
  for (const [port, url, key] of [[5176, '', ''], [5177, 'http://127.0.0.1:54321', 'sb_publishable_local_mock_only']]) {
    const child = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd, windowsHide: true,
      env: { ...process.env, VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const server = { child, log: '' }
    servers.push(server)
    child.stdout.on('data', chunk => { server.log += chunk.toString() })
    child.stderr.on('data', chunk => { server.log += chunk.toString() })
    let ready = false
    for (let attempt = 0; attempt < 200; attempt++) {
      if (child.exitCode !== null) throw new Error(`Test server ${port} exited: ${server.log}`)
      if (server.log.includes(`127.0.0.1:${port}`)) {
        try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) { ready = true; break } } catch { /* wait until listening */ }
      }
      await delay(100)
    }
    if (!ready) throw new Error(`Test server ${port} did not start: ${server.log}`)
  }
  runner = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)], { cwd, windowsHide: true, env: process.env, stdio: 'inherit' })
  const result = await new Promise(resolve => runner.once('exit', code => resolve(code ?? 1)))
  process.exitCode = result
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally { await cleanup() }
