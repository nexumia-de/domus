// Builds the app into dist/: index.html and main.js (placeholder for now).
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
});
copyFileSync('src/index.html', 'dist/index.html');
