import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // In local dev, the frontend (Vite, port 5173) and backend (Express,
      // port 5000) run as separate processes. This proxy lets the frontend
      // code call relative '/api/...' paths (the same way it works in
      // production, where Express serves both from one origin) instead of
      // needing a hardcoded 'http://localhost:5000' that would break once
      // deployed.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
