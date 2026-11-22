// Builds the app once for interact.mjs and returns the file GJS runs.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export async function bundleApp() {
  const pkg = join(import.meta.dirname, '..');
  const run = spawnSync('npm', ['run', 'build', '--silent'], { cwd: pkg, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`build failed: ${run.stderr || run.stdout}`);
  return join(pkg, 'dist', 'de.nexumia.Mixtura.js');
}
