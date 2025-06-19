import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
// import { API_PORT } from '@utils/constants'
const API_PORT = 3000

export default defineConfig(({ isSsrBuild }) => ({
    server: {
        proxy: {
            '/api': {
                target: `http://localhost:${API_PORT}`,
                changeOrigin: true,
            },
        },
    },
    build: {
        rollupOptions: isSsrBuild
            ? {
                  input: './app/handler.ts',
              }
            : undefined,
    },
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}))
