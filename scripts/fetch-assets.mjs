import { mkdir, writeFile } from 'node:fs/promises'

// Run from E:\loveapp. Downloads contain no Git metadata or upstream app copy.
const base = new URL('../', import.meta.url)
// Fixtures are only uploaded by automated tests, never seeded into the app.
const imageDir = new URL('tests/fixtures/', base)
await mkdir(imageDir, { recursive: true })
const assets = {
  flowers: 'photo-1490750967868-88aa4486c946',
  coffee: 'photo-1442512595331-e89e73853f31'
}
async function download(url, path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
      const content = new Uint8Array(await response.arrayBuffer())
      await writeFile(path, content)
      console.log(`${path.pathname.split('/').pop()}: ${content.byteLength} bytes`)
      return
    } catch (error) { if (attempt === 3) throw error }
  }
}
// A few downloads at a time keep the network load small.
const entries = Object.entries(assets)
for (let i = 0; i < entries.length; i += 3) {
  const results = await Promise.allSettled(entries.slice(i, i + 3).map(([name, id]) => download(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`, new URL(`${name}.jpg`, imageDir))))
  for (const result of results) if (result.status === 'rejected') throw result.reason
}
await download('https://raw.githubusercontent.com/Navaneeth223/timeless-love-anniversary-app/474d8720761b87d9502ac8e319e602a5db5a4a71/LICENSE', new URL('LICENSE', base))
