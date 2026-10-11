export function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (/Failed to fetch|NetworkError|network request/i.test(message)) return '暂时连接不上服务器，请检查网络后重试。输入内容会保留。'
  if (/Invalid login credentials/i.test(message)) return '邮箱或密码不正确，请再检查一下。'
  if (/Email not confirmed/i.test(message)) return '请先打开注册邮件确认邮箱，再回来登录。'
  if (/rate limit|too many requests/i.test(message)) return '操作太频繁，请稍等一会儿再试。'
  if (/JWT|refresh token|session.*expired/i.test(message)) return '登录已过期，请重新登录。'
  if (/relation .* does not exist|Could not find.*(table|function)|schema cache/i.test(message)) return '数据库还没有准备好，请先执行项目中的 Supabase 迁移脚本。'
  if (/permission denied|row-level security/i.test(message)) return '这次操作没有被允许，请确认你已加入这个空间。'
  return message || '这次操作没有完成，请稍后重试。'
}
