import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
  proxy: {
    '/api': {
      target: 'https://ky-luat-le-lai-backend.onrender.com/', // cổng backend của bạn
      changeOrigin: true,
      secure: false,
    },
  },
},
})
