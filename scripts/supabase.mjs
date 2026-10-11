import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const child = spawn(process.execPath, [resolve(root, 'node_modules/supabase/dist/supabase.js'), ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, SUPABASE_HOME: resolve(root, '.supabase-cli') },
  stdio: 'inherit',
  windowsHide: true
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
