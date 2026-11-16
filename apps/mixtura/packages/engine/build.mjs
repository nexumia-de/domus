// Builds the engine as one dependency-free ES module (dist/engine.mjs).
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/engine.mjs',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
});
