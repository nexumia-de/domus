// Builds the engine: one dependency-free ES module (dist/engine.mjs), the
// declarations (dist/index.d.ts and one file per module) and a check that the
// bundle has no DOM or Node-only reference. MIXTURA_ENGINE_OUT changes dist.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { build } from 'esbuild';
import { checkDist } from './check-dist.mjs';

const out = process.env.MIXTURA_ENGINE_OUT ?? 'dist';
rmSync(out, { recursive: true, force: true });

await build({
  entryPoints: ['src/index.ts'],
  outfile: join(out, 'engine.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
});

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json', '--outDir', out], {
  stdio: 'inherit',
});

const problems = checkDist(readFileSync(join(out, 'engine.mjs'), 'utf8'));
if (problems.length > 0) {
  throw new Error(`dist/engine.mjs is not pure:\n${problems.join('\n')}`);
}
console.log(`${String(statSync(join(out, 'engine.mjs')).size).padStart(8)}  engine.mjs`);
