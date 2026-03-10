import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // --- Servidor de desarrollo LOCAL ---
  // Este proxy solo aplica cuando corres "npm run dev" en tu máquina.
  // En Railway el frontend se sirve como archivos estáticos (build),
  // por lo que esta configuración NO afecta la versión desplegada.
  server: {
    port: 5173,
    proxy: {
      // Proxy opcional: redirige /api al backend local.
      // Útil si prefieres usar rutas relativas en vez de la URL completa.
      // El frontend ya usa VITE_API_URL, así que esto es un respaldo.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Proxy para Socket.IO en desarrollo local
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true, // Soporte WebSocket
      },
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
    },
  },
})
