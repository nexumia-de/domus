// The build every native app uses: one ES module for `gjs -m`. GJS resolves no npm
// packages, so esbuild makes one file of the app, its engine, the host package and
// the two crypto libraries; `gi://` and GJS's own modules stay imports.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

export const GITHUB_API = 'https://api.github.com';

/**
 * @param {string} entry absolute path of the source file
 * @param {string} outfile
 * @param {Record<string, string>} [define]
 * @returns {Promise<string>} the file written
 */
export async function bundle(entry, outfile, define = {}) {
  mkdirSync(dirname(outfile), { recursive: true });
  await build({
    entryPoints: [entry],
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

/**
 * The version of the newest stable release in a metainfo file, the one place a
 * version is kept (`release.toml`; the tag `<app>-v<version>` must match).
 * @param {string} file
 * @returns {string}
 */
export function metainfoVersion(file) {
  const xml = readFileSync(file, 'utf8');
  for (const [tag] of xml.matchAll(/<release\b[^>]*>/g)) {
    if (/\btype="development"/.test(tag)) continue;
    const version = /\bversion="([^"]+)"/.exec(tag)?.[1];
    if (version) return version;
  }
  throw new Error('the metainfo has no stable <release>');
}

/**
 * An app as one module GJS runs with `gjs -m`; its package folder holds `src/main.ts`
 * and `data/<appId>.metainfo.xml`.
 * @param {{ root: string, appId: string, outfile?: string, githubApi?: string, define?: Record<string, string> }} options
 *   `define` adds compile-time constants (an app's data), each a JSON text.
 *   `githubApi` is for checks only: the address is compiled in, never an input of the
 *   running app.
 */
export function buildApp({
  root,
  appId,
  outfile = join(root, 'dist', `${appId}.js`),
  githubApi = GITHUB_API,
  define = {},
}) {
  const version = metainfoVersion(join(root, 'data', `${appId}.metainfo.xml`));
  return bundle(join(root, 'src', 'main.ts'), outfile, {
    __APP_ID__: JSON.stringify(appId),
    __VERSION__: JSON.stringify(version),
    __GITHUB_API__: JSON.stringify(githubApi),
    ...define,
  });
}
