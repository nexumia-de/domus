import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/', 'dist-*/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright scripts pass functions to the page, so they see browser globals too.
    files: ['e2e/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Nothing of another app, and no way to reach another host than the ones the CSP names:
    // the GitHub address is a constant of the build (src/env.ts), not an input.
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@mixtura/*', '@culina/*', '@emptio/*'], message: 'An app imports no app.' },
            { group: ['../../*', '../../../*'], message: 'Stay inside this part.' },
          ],
        },
      ],
    },
  },
);
