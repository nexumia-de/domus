// Builds the app into dist/: `npm run build -w @emptio/app`.
// Fixed file names and relative URLs: the app is served from the folder
// `emptio/` of the address. The service worker gets the list of built files
// and a cache version derived from their content.
//
// The address of the GitHub API is a constant of the build, never an input of
// the running app. The browser checks need a fake storage on localhost, so
// `buildApp({ githubApi, outdir })` can compile another address in and lets the
// page's policy connect to that one origin; `npm run build` never does.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const GITHUB_API = 'https://api.github.com';

const root = fileURLToPath(new URL('.', import.meta.url));
const src = join(root, 'src');

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
    )
    .sort();

/**
 * @param {{ outdir?: string, githubApi?: string }} [options]
 * @returns {Promise<{ outdir: string, files: string[], version: string }>}
 */
export async function buildApp({ outdir = join(root, 'dist'), githubApi = GITHUB_API } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(join(outdir, 'icons'), { recursive: true });

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
  });
  // Classic script: it runs before the stylesheet to set the theme without a flash.
  await build({
    ...common,
    format: 'iife',
    entryPoints: { 'theme-init': join(src, 'theme-init.ts') },
  });

  let html = readFileSync(join(src, 'index.html'), 'utf8');
  if (githubApi !== GITHUB_API) {
    // A test build only: the fake storage's origin joins connect-src.
    html = html.replace("connect-src 'self'", `connect-src 'self' ${new URL(githubApi).origin}`);
  }
  writeFileSync(join(outdir, 'index.html'), html);
  cpSync(join(src, 'manifest.webmanifest'), join(outdir, 'manifest.webmanifest'));
  for (const name of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
    cpSync(join(src, 'assets', name), join(outdir, 'icons', name));
  }

  const files = listFiles(outdir).map((file) => relative(outdir, file).split('\\').join('/'));
  const hash = createHash('sha256');
  for (const file of files) {
    hash
      .update(file)
      .update('\0')
      .update(readFileSync(join(outdir, file)));
  }
  const version = hash.digest('hex').slice(0, 16);
  await build({
    ...common,
    format: 'iife',
    entryPoints: { sw: join(src, 'sw.ts') },
    define: { PRECACHE_FILES: JSON.stringify(files), CACHE_VERSION: JSON.stringify(version) },
  });
  return { outdir, files: [...files, 'sw.js'], version };
}

if (process.argv[1] === import.meta.filename) {
  const { outdir, files, version } = await buildApp();
  console.log(`dist: ${outdir}, ${files.length} files, cache emptio-${version}`);
}
