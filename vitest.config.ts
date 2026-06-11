import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
      // `server-only`'s default export throws outside an RSC context (Vitest
      // doesn't set the `react-server` condition); stub it to an empty module.
      'server-only': path.resolve(__dirname, './test/stubs/empty.ts'),
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'e2e/**',
    ],
  },
})
