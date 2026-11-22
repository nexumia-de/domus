import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/', '**/*.generated.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // The native app's Playwright scripts pass functions to the page, so they see browser globals too.
    files: ['packages/linux/scripts/**/*.mjs'],
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
              group: ['**/packages/app/**', '@mixtura/app', '@mixtura/app/*'],
              message: 'The engine does not depend on the app.',
            },
          ],
        },
      ],
    },
  },
  {
    // The app reaches the engine only through its entry point
    // (docs/engine.md); the seed data files are the one other export path.
    // packages/engine/test/app-imports.test.ts keeps this rule in place.
    files: ['packages/app/**/*.ts', 'packages/app/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@mixtura/engine/(?!seed/)',
              message: 'Import from @mixtura/engine only (docs/engine.md).',
            },
            {
              group: ['**/packages/engine/**', '**/engine/src/**', '**/engine/dist/**'],
              message: 'Import from @mixtura/engine only (docs/engine.md).',
            },
          ],
        },
      ],
    },
  },
);
