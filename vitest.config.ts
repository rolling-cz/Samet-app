import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  // `tsconfig.json` leaves `jsx` at `preserve` for Next, which compiles with the
  // automatic runtime itself. esbuild would otherwise fall back to the classic
  // one and every `.tsx` under test would fail on `React is not defined`.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
