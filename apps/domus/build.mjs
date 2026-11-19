// Builds the app into dist/: `npm run build -w @domus/app`.
// Fixed file names, all URLs relative (the app is served from the root of the
// address, but nothing depends on it). No manifest and no service worker yet
// (docs/deployment.md): an installable page at `/` would claim a scope above
// the apps.
//
// The address of the GitHub API is a constant of the build, never an input of
// the running app: a token must not be sendable to another host by a URL
// parameter or a stored setting. The browser checks need a fake API on
// localhost, so `buildApp({ githubApi, outdir })` can compile another address
// in, and then also lets the page's policy connect to that one origin. The
// command line does this only when DOMUS_GITHUB_API and DOMUS_OUT are both set
// (a test build into a folder of its own); `npm run build` never does.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const GITHUB_API = 'https://api.github.com';

const root = fileURLToPath(new URL('.', import.meta.url));
const src = join(root, 'src');

/**
 * @param {{ outdir?: string, githubApi?: string }} [options]
 * @returns {Promise<string>} the folder written
 */
export async function buildApp({ outdir = join(root, 'dist'), githubApi = GITHUB_API } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  const common = {
    bundle: true,
    minify: true,
    target: 'es2022',
    logLevel: 'warning',
    outdir,
    legalComments: 'none',
  };
  await build({
    ...common,
    format: 'esm',
    entryPoints: { main: join(src, 'main.ts'), app: join(src, 'styles/index.css') },
    define: { __GITHUB_API__: JSON.stringify(githubApi) },
    // The MIT licence of the bundled QR encoder asks for its notice in every copy.
    banner: {
      js: '/* Includes QR Code Generator for JavaScript, Copyright (c) 2009 Kazuhiko Arase, released under the MIT license */',
    },
  });
  // Classic script: it runs before the stylesheet to set the theme without a flash.
  await build({
    ...common,
    format: 'iife',
    entryPoints: { 'theme-init': join(src, 'theme-init.ts') },
  });

  let html = readFileSync(join(src, 'index.html'), 'utf8');
  if (githubApi !== GITHUB_API) {
    // A test build only: the fake API's origin joins connect-src.
    html = html.replace("connect-src 'self'", `connect-src 'self' ${new URL(githubApi).origin}`);
  }
  writeFileSync(join(outdir, 'index.html'), html);
  cpSync(join(src, 'icon.svg'), join(outdir, 'icon.svg'));
  return outdir;
}

if (process.argv[1] === import.meta.filename) {
  const api = process.env.DOMUS_GITHUB_API;
  const out = process.env.DOMUS_OUT;
  if ((api === undefined) !== (out === undefined)) {
    throw new Error('DOMUS_GITHUB_API and DOMUS_OUT only work together (a test build)');
  }
  const folder = await buildApp(api === undefined ? {} : { githubApi: api, outdir: out });
  console.log(`dist: ${folder}${api === undefined ? '' : ` (test build, GitHub API ${api})`}`);
}
