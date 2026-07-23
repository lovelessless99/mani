import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    passWithNoTests: true,
    environment: 'happy-dom',
    setupFiles: 'test/vitest/setup-file.ts',
    include: [
      'src/**/*.{spec,test}.{ts,js}',
      'tests/**/*.{spec,test}.{ts,js}',
    ],
  },
  plugins: [vue({ ...templateCompilerOptions })],
  resolve: {
    alias: {
      src: fileURLToPath(new URL('./src', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
      layouts: fileURLToPath(new URL('./src/layouts', import.meta.url)),
      pages: fileURLToPath(new URL('./src/pages', import.meta.url)),
      stores: fileURLToPath(new URL('./src/stores', import.meta.url)),
      boot: fileURLToPath(new URL('./src/boot', import.meta.url)),
    },
  },
})
