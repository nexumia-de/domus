// `node scripts/seed.mjs <folder> [en|de]`: writes the recorded list into a
// folder for EMPTIO_DATA_DIR (checks and screenshots).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const work = mkdtempSync(join(tmpdir(), 'emptio-seed-'));
try {
  const outfile = join(work, 'seed.mjs');
  await build({
    entryPoints: [join(import.meta.dirname, 'seed-entry.ts')],
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
