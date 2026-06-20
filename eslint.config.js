import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'docs/public/**',
      'wasm_blur/**',
      'node_modules/**'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Opinionated stylistic rule; fires on intentional init-then-branch-assign
      // patterns in the image-processing hot loops.
      'no-useless-assignment': 'off'
    }
  },
  {
    // Tests also use Vitest globals (describe/it/expect) via vitest config.
    files: ['**/*.test.js'],
    languageOptions: {
      globals: { ...globals.vitest }
    }
  }
];
