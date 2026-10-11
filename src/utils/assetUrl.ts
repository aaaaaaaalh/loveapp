// Only built-in illustrations need the GitHub Pages repository prefix.
// Supabase, user-provided URLs and browser Object URLs remain unchanged.
export function assetUrl(src: string) {
  return src.startsWith('/images/') ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src
}
