export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function calendarDaysBetween(start: string, now = new Date()) {
  const [year, month, day] = start.split('-').map(Number)
  const value = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(year, month - 1, day)) / 86_400_000
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function formatDate(value: string, withYear = false) {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  return new Intl.DateTimeFormat('zh-CN', { ...(withYear ? { year: 'numeric' as const } : {}), month: 'long', day: 'numeric' }).format(date)
}

export function dottedDate(value: string) { return value.slice(0, 10).replaceAll('-', '.') }
