import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The backend CORS allowlist defaults to http://localhost:5173. Pin the port
    // (strictPort) so a busy 5173 fails loudly instead of silently bumping to 5174
    // and hitting a CORS wall that looks like a bug but isn't (landmine #4).
    port: 5173,
    strictPort: true,
  },
})
