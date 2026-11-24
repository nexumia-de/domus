import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The package is pure (AGENTS.md): no clock, no randomness, no logging, no host API, and no
// import of the host package or of an app. test/purity.test.ts keeps these rules in force.
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
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        ...clockAndChance.map((name) => ({
          name,
          message: 'Time and ids come into the list package as input.',
        })),
        ...host.map((name) => ({ name, message: 'The list package has no host API.' })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'The list package is deterministic.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nexumia-de/hospes', '@nexumia-de/hospes/*', '**/packages/host/**'],
              message: 'The list package does not depend on the host package.',
            },
          ],
        },
      ],
    },
  },
);
