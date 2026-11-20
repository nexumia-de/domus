// Builds the native app into dist/: `npm run build -w @emptio/linux`.
// GJS runs ES modules but resolves no npm packages, so esbuild makes one file
// of the app, the engine, the host package and the two crypto libraries;
// `gi://` and GJS's own modules stay imports.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * @param {string} entry relative to this package
 * @param {string} outfile
 * @param {Record<string, string>} [define]
 * @returns {Promise<string>} the file written
 */
export async function bundle(entry, outfile, define = {}) {
  mkdirSync(dirname(outfile), { recursive: true });
  await build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    target: 'firefox115',
    external: ['gi://*', 'system', 'gettext', 'cairo', 'resource://*'],
    legalComments: 'none',
    logLevel: 'warning',
    define,
    banner: {
      js: '// Includes @noble/ciphers and @noble/hashes, Copyright (c) Paul Miller (https://paulmillr.com), MIT licence.',
    },
  });
  return outfile;
}

export const APP_ID = 'de.nexumia.Emptio';
export const GITHUB_API = 'https://api.github.com';

/**
 * The app as one module GJS runs with `gjs -m`.
 * @param {{ outfile?: string, githubApi?: string }} [options] `githubApi` is for checks only:
 *   the address is compiled in, never an input of the running app.
 */
export async function buildApp({
  outfile = join(root, 'dist', `${APP_ID}.js`),
  githubApi = GITHUB_API,
} = {}) {
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return bundle('src/main.ts', outfile, {
    __APP_ID__: JSON.stringify(APP_ID),
    __VERSION__: JSON.stringify(version),
    __GITHUB_API__: JSON.stringify(githubApi),
  });
}

if (process.argv[1] === import.meta.filename) {
  console.log(`dist: ${await buildApp()}`);
}
