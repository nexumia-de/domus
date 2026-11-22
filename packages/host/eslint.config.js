import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright scripts pass functions to the page, so they see browser globals too.
    files: ['testing/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  // No purity rules here, unlike packages/model: this package is the one that
  // may touch the host (fetch, Web Crypto, the browser's online flag). What
  // it reaches stays behind an injectable function (AGENTS.md).
);
