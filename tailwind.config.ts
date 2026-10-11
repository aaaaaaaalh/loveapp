import type { Config } from 'tailwindcss'

// Soft rosewater / peach palette adapted from the MIT reference project.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { rosewater: '#f8e8ed', peach: '#ffe5d4', cream: '#fcf8f5', ink: '#443531', rose: { 50: '#fff3f4', 100: '#f8e8ed', 200: '#edc2c7', 300: '#dda0a8', 400: '#c57785', 500: '#b95b6d', 600: '#a04456', 700: '#833548' } },
      boxShadow: { soft: '0 8px 32px rgba(85, 55, 45, .045)' },
      fontFamily: { sans: ['"Our Space Sans"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'], display: ['Georgia', '"Songti SC"', '"SimSun"', 'serif'] }
    }
  },
  plugins: []
} satisfies Config
