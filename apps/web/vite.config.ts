import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React, its DOM renderer and the router change rarely, so they get a
        // chunk of their own that stays cached across deploys.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)\//.test(id)) return 'react'
          if (id.includes('node_modules/recharts/')) return 'charts'
        },
      },
    },
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:8080', rewrite: (p) => p.replace(/^\/api/, '') } },
  },
})
