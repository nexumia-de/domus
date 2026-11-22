import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// What the engine may not touch (AGENTS.md: the engine is pure).
// packages/engine/test/purity.test.ts checks that these rules are in force.
const clockAndChance = ['Date', 'performance', 'crypto'];
const host = [
  'window',
  'document',
  'navigator',
  'indexedDB',
  'fetch',
  'localStorage',
  'sessionStorage',
  'process',
];

export default tseslint.config(
  { ignores: ['**/dist/', '.claude/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright scripts pass functions to the page, so they see browser globals too.
    files: ['packages/app/e2e/**/*.mjs', 'packages/linux/scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        ...clockAndChance.map((name) => ({
          name,
          message: 'Time and randomness come into the engine as input.',
        })),
        ...host.map((name) => ({ name, message: 'The engine has no host API.' })),
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
              group: ['**/packages/app/**', '@emptio/app', '@emptio/app/*'],
              message: 'The engine does not depend on the app.',
            },
          ],
        },
      ],
    },
  },
  {
    // The app uses the engine through its public entry only.
    files: ['packages/app/**/*.ts', 'packages/app/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^@emptio/engine/', message: 'Import from @emptio/engine only.' },
            {
              group: ['**/packages/engine/**', '**/engine/src/**'],
              message: 'Import from @emptio/engine only.',
            },
          ],
        },
      ],
    },
  },
);
