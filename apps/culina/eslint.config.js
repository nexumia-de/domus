import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/',
      '.claude/',
      'packages/app/src/store/validators.generated.*',
      'packages/*/src/**/*.generated.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright scripts pass functions to the page, so they see browser globals too.
    files: ['packages/app/e2e/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // The engine is pure: no clock, no randomness, no logging, no DOM or
    // host globals, no import from the app (AGENTS.md). Time and random
    // numbers come in as input. packages/engine/test/purity.test.ts keeps
    // this rule set from being removed silently.
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        ...['Date', 'performance', 'crypto'].map((name) => ({
          name,
          message: 'The engine gets time and randomness as input.',
        })),
        ...['window', 'document', 'navigator', 'indexedDB', 'fetch', 'localStorage', 'process'].map(
          (name) => ({ name, message: 'The engine has no host API.' }),
        ),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'The engine is deterministic.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/app/**', '@culina/app', '@culina/app/*'],
              message: 'The engine does not depend on the app.',
            },
          ],
        },
      ],
    },
  },
  {
    // The app reaches the engine only through its entry point.
    files: ['packages/app/**/*.ts', 'packages/app/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@culina/engine/',
              message: 'Import from @culina/engine only.',
            },
            {
              group: ['**/packages/engine/**', '**/engine/src/**', '**/engine/dist/**'],
              message: 'Import from @culina/engine only.',
            },
          ],
        },
      ],
    },
  },
);
