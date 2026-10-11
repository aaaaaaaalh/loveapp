export function isWebUrl(value: string) {
  if (!value.trim()) return true
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}
