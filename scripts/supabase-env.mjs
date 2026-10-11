import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const run = promisify(execFile)
const projectRef = process.argv[2]
const destination = resolve(root, '.env.local')
const temporary = resolve(root, '.env.local.pending')

async function main() {
  if (!/^[a-z]{20}$/.test(projectRef ?? '')) throw new Error('Provide the approved Supabase project reference (20 lowercase letters).')
  for (const file of ['.env.local', '.env.local.pending']) {
    await run('git', ['check-ignore', '--quiet', file], { cwd: root, windowsHide: true })
  }
  let previous = ''
  try { previous = await readFile(destination, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw new Error('Cannot read the existing local configuration.') }
  const url = `https://${projectRef}.supabase.co`
  const oldUrl = previous.match(/^VITE_SUPABASE_URL\s*=\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (oldUrl && oldUrl.replace(/\/$/, '') !== url) throw new Error('Existing configuration targets another project; it has not been overwritten.')
  // Capture the response in memory: never inherit stdout, print keys or save raw CLI output.
  let stdout
  try {
    ;({ stdout } = await run(process.execPath, [resolve(root, 'scripts/supabase.mjs'), 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json', '--agent', 'no', '--output-format', 'text'], { cwd: root, windowsHide: true, maxBuffer: 1024 * 1024 }))
  } catch { throw new Error('Unable to retrieve project keys. Complete official CLI login and verify project access.') }
  let keys
  try { keys = JSON.parse(stdout) } catch { throw new Error('Unexpected CLI response. No configuration was written.') }
  if (!Array.isArray(keys)) throw new Error('Unexpected API key list. No configuration was written.')
  const key = keys.find(item => item.type === 'publishable' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(item.api_key ?? ''))?.api_key
  if (!key) throw new Error('No usable publishable key exists. No secret or legacy key was substituted.')
  const lines = previous.split(/\r?\n/).filter(line => !/^\s*VITE_SUPABASE_(URL|PUBLISHABLE_KEY)\s*=/.test(line))
  while (lines.at(-1) === '') lines.pop()
  lines.push(`VITE_SUPABASE_URL=${url}`, `VITE_SUPABASE_PUBLISHABLE_KEY=${key}`, '')
  let createdTemporary = false
  try {
    await writeFile(temporary, lines.join('\n'), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    createdTemporary = true
    await rename(temporary, destination)
  } catch {
    if (createdTemporary) await unlink(temporary).catch(() => {})
    throw new Error('Unable to write local configuration atomically. No key has been logged.')
  }
  console.log('Saved Project URL and publishable key to gitignored .env.local. Key values are not displayed.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
