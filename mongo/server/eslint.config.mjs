import js from '@eslint/js'
import security from 'eslint-plugin-security'
import nodePlugin from 'eslint-plugin-n'
import globals from 'globals'

export default [
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: {
      security,
      n: nodePlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      // Variables
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',

      // Qualité
      'eqeqeq': ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Sécurité critique
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // Node.js
      'n/no-missing-require': 'warn',
      'n/no-process-exit': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'public/**', 'uploads/**', '../database/seed.js'],
  },
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.jest,
      },
    },
  },
]
