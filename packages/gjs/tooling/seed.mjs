// `runSeed(entry)`: bundles an app's recorded-data script (`scripts/seed-entry.ts`) for Node
// and runs it with the arguments of the caller (`<folder> [en|de]`). The data is for
// checks and screenshots, never a person's.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

/** @param {string} entry absolute path of the TypeScript script */
export async function runSeed(entry) {
  const work = mkdtempSync(join(tmpdir(), 'gjs-seed-'));
  try {
    const outfile = join(work, 'seed.mjs');
    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'warning',
    });
    const run = spawnSync(process.execPath, [outfile, ...process.argv.slice(2)], {
      stdio: 'inherit',
    });
    process.exitCode = run.status ?? 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
