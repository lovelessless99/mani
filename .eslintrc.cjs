/* eslint-env node */

const { resolve } = require('path')

module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.ts', '*.vue'],
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:vue/vue3-essential',
      ],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.vue'],
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'vue/multi-word-component-names': 'off',
      },
    },
    {
      files: ['*.js', '*.cjs'],
      extends: ['eslint:recommended'],
      env: {
        node: true,
      },
    },
  ],
}
