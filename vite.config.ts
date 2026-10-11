import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/loveapp/' : '/',
  define: { 'import.meta.env.VITE_ROUTER_MODE': JSON.stringify(process.env.GITHUB_PAGES === 'true' ? 'hash' : 'browser') },
  plugins: [react(), tailwindcss()],
  server: {
    // Chrome locks profile files on Windows. Test/cache artifacts must not be
    // watched by Vite, otherwise browser QA can crash the preview server.
    watch: {
      ignored: ['**/.tmp/**', '**/.npm-cache/**', '**/.supabase-cli/**', '**/.supabase/**', '**/supabase/.temp/**', '**/.vercel/**', '**/.vercel-cli/**', '**/.github-cli/**', '**/.edgeone/**', '**/.edgeone-cli/**', '**/test-results/**', '**/playwright-report/**', '**/docs/qa/**']
    }
  }
})
