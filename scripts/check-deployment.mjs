import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true })
const files = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort()
const problems = []
const forbidden = /(^|\/)(node_modules|dist|\.git|\.tmp|\.npm-cache|\.supabase-cli|\.github-cli|\.vercel-cli|\.vercel|\.edgeone|\.edgeone-cli|test-results|playwright-report)(\/|$)|(^|\/)\.env(\.|$)|supabase\/(\.temp|\.branches)\//
const signatures = [
  ['Supabase secret', /sb_secret_[A-Za-z0-9_-]{16,}/],
  ['Supabase access token', /sbp_[A-Za-z0-9]{20,}/],
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Database password URL', /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]{4,}@/],
  ['Service role JWT', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
]
// Compare actual local credentials in memory; never print values or matched lines.
const secrets = []
for (const path of ['.supabase-cli/access-token', '.vercel-cli/auth.json', '.github-cli/hosts.yml', '.edgeone/auth.json', '.edgeone-cli/.edgeone/eo_token']) {
  try {
    const content = (await readFile(resolve(root, path), 'utf8')).trim()
    if (path.endsWith('access-token')) secrets.push(content)
    else if (path.endsWith('.json') || path.endsWith('/eo_token')) {
      const collect = value => {
        if (!value || typeof value !== 'object') return
        for (const [name, item] of Object.entries(value)) {
          if (/token|secret|password/i.test(name) && typeof item === 'string') secrets.push(item)
          else if (item && typeof item === 'object') collect(item)
        }
      }
      collect(JSON.parse(content))
    }
    else { const token = content.match(/oauth_token:\s*(\S+)/)?.[1]; if (token) secrets.push(token) }
  } catch { /* optional CLI credentials may not exist yet */ }
}
for (const file of files) {
  if (forbidden.test(file) && file !== '.env.example') problems.push({ file, reason: 'Forbidden deployment/source-control path' })
  const content = await readFile(resolve(root, file))
  for (const secret of secrets.filter(value => value.length > 12)) if (content.includes(Buffer.from(secret))) problems.push({ file, reason: 'Contains a real local credential' })
  if (!content.includes(0)) {
    const text = content.toString('utf8')
    for (const [name, pattern] of signatures) if (pattern.test(text)) problems.push({ file, reason: name })
  }
}
const env = await readFile(resolve(root, '.env.local'), 'utf8')
const entries = Object.fromEntries(env.split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1).trim()] }))
if (!entries.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) problems.push({ file: '.env.local', reason: 'Frontend key is not publishable' })
if (entries.VITE_SUPABASE_URL !== 'https://rnramhagybuibobmketv.supabase.co') problems.push({ file: '.env.local', reason: 'Unexpected Supabase project' })
if (Object.keys(entries).some(name => name.startsWith('VITE_') && !['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].includes(name))) problems.push({ file: '.env.local', reason: 'Unexpected public environment variable' })
const excluded = ['.env.local', 'node_modules/', 'dist/', '.supabase-cli/access-token', '.github-cli/hosts.yml', '.vercel-cli/auth.json', '.vercel/project.json', '.edgeone/auth.json', '.edgeone-cli/.edgeone/eo_token', 'supabase/.temp/project-ref', '.tmp/']
for (const path of excluded) { try { git(['check-ignore', '-q', path]) } catch { problems.push({ file: path, reason: 'Not ignored by Git' }) } }
await mkdir(resolve(root, 'docs'), { recursive: true })
const report = { at: new Date().toISOString(), fileCount: files.length, files, excluded, environmentNames: Object.keys(entries), problems, note: 'Pattern scan plus exact local credential comparison; not a proof that all possible secrets are absent. Images require separate review.' }
await writeFile(resolve(root, 'docs/deployment-security.json'), JSON.stringify(report, null, 2) + '\n')
await writeFile(resolve(root, 'docs/deployment-files.txt'), files.join('\n') + '\n')
console.log(JSON.stringify({ fileCount: files.length, problems, report: 'docs/deployment-security.json', manifest: 'docs/deployment-files.txt' }, null, 2))
if (problems.length) process.exitCode = 1
