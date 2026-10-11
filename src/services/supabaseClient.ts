import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

function validateConfig() {
  if (!url && !key) return ''
  if (!url || !key) return 'Supabase 配置不完整，请在 .env.local 填写项目地址和公开客户端 key。'
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return 'Supabase 项目地址需要使用 HTTPS。'
  } catch { return 'Supabase 项目地址格式不正确。' }
  if (!key.startsWith('sb_publishable_')) return '这里只能使用 sb_publishable_ 开头的公开客户端 key，不能使用管理员密钥。'
  return ''
}

export const configurationError = validateConfig()
export const supabase = url && key && !configurationError ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null

export const cloudRequested = Boolean(url || key)
