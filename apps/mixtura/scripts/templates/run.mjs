// Bundles unmatched.ts with esbuild (the engine's sources use extension-less
// imports) and runs it: `node scripts/templates/run.mjs [--json]`.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dir = mkdtempSync(join(tmpdir(), 'mixtura-templates-'));
const outfile = join(dir, 'unmatched.mjs');
try {
  await build({
    entryPoints: [new URL('./unmatched.ts', import.meta.url).pathname],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    logLevel: 'error',
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });
  const { main } = await import(pathToFileURL(outfile).href);
  main(process.argv.slice(2), new URL('../..', import.meta.url).pathname);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
