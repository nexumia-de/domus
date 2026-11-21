import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright scripts pass functions to the page, so they see browser globals too.
    files: ['tooling/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
