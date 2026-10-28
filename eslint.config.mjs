import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.mjs'],
    extends: [
      eslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { 
        console: 'readonly', 
        Buffer: 'readonly', 
        URL: 'readonly' 
      }
    },
    rules: {
      'max-lines-per-function': [
        'error',
        {
          max: 40,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'prefer-const': [
        'error',
        {
          destructuring: 'any',
          ignoreReadBeforeAssign: false,
        },
      ],
      curly: ['error', 'all'],
      'no-plusplus': ['error'],
      'arrow-body-style': ['error', 'as-needed'],
      complexity: ['error', { max: 10 }],
      'max-params': ['error', { max: 3 }],
      'max-lines': ['error', { max: 300, skipComments: true, skipBlankLines: true }],
      'no-continue': 'error',
      'no-nested-ternary': 'error'
    },
  },
]);
