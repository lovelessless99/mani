import path from 'path'
import { fileURLToPath } from 'url'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import js from '@eslint/js'
import globals from 'globals'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  // Ignore generated and dependency directories
  {
    ignores: ['.quasar/**', 'dist/**', 'node_modules/**'],
  },

  js.configs.recommended,

  // Spread the Vue flat/essential preset (handles parser + basic Vue rules)
  ...vuePlugin.configs['flat/essential'],

  // TypeScript + Vue files — add TS rules on top
  {
    files: ['**/*.ts', '**/*.vue'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        project: path.resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        // Vite replaces process.env at build time; declare it so ESLint doesn't error
        process: 'readonly',
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/multi-word-component-names': 'off',
    },
  },

  // JS / CJS config and tooling files
  {
    files: ['**/*.js', '**/*.cjs', '*.config.js', '*.config.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {},
  },
]
