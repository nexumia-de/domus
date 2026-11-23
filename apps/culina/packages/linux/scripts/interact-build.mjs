// Builds the app once for interact.mjs and returns the file GJS runs.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export async function bundleApp() {
  const pkg = join(import.meta.dirname, '..');
  const run = spawnSync('npm', ['run', 'build', '--silent'], { cwd: pkg, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`build failed: ${run.stderr || run.stdout}`);
  return join(pkg, 'dist', 'de.nexumia.Culina.js');
}

/**
 * The app built against another GitHub address (a fake on localhost) into `outfile`, for the
 * steps that create a space. The address is compiled in, as in a release.
 */
export async function bundleAppWith(githubApi, outfile) {
  const { buildApp } = await import('../build.mjs');
  return buildApp({ githubApi, outfile });
}
