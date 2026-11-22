// Builds the app into dist/ (or the folder in MIXTURA_OUT): static files
// for any web server. main.js is the app, app.css the one stylesheet,
// sw.js the service worker with the list of all files and a cache name
// made from their content.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
import { headersFile, metaPolicy } from './headers.mjs';
import { assembleSeed } from './seed-assemble.mjs';
import './compile-schemas.mjs'; // writes the validators main.js bundles

const out = process.env.MIXTURA_OUT ?? 'dist';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'icons'), { recursive: true });
mkdirSync(join(out, 'seed'), { recursive: true });

const common = {
  bundle: true,
  format: 'iife',
  target: 'es2022',
  legalComments: 'none',
  minify: true,
};

await build({
  ...common,
  entryPoints: ['src/main.ts'],
  outfile: join(out, 'main.js'),
  // MIXTURA_GITHUB_API is for the browser checks only: a test build that talks to a fake of
  // GitHub's API. Every other build has https://api.github.com compiled in (src/env.ts).
  define: {
    APP_VERSION: JSON.stringify(version),
    ...(process.env.MIXTURA_GITHUB_API
      ? { __GITHUB_API__: JSON.stringify(process.env.MIXTURA_GITHUB_API) }
      : {}),
  },
});

// The ranking worker (stock/rank-worker.ts) is its own script next to the page.
await build({
  ...common,
  entryPoints: ['src/stock/rank-worker.ts'],
  outfile: join(out, 'rank-worker.js'),
});

// The theme bootstrap runs from <head> before first paint (index.html has no inline script).
await build({
  ...common,
  entryPoints: ['src/theme-init.ts'],
  outfile: join(out, 'theme-init.js'),
});

const styles = [
  'tokens',
  'base',
  'shell',
  'components',
  'browse',
  'menu',
  'stock',
  'swap',
  'editor',
  'versions',
  'spec-extras',
  'app',
];
// The shared frame's styles come first; the app's own tokens and rules follow.
const frameCss = readFileSync(
  fileURLToPath(import.meta.resolve('@nexumia-de/hospes/frame.css')),
  'utf8',
);
const reportCss = readFileSync(
  fileURLToPath(import.meta.resolve('@nexumia-de/hospes/report-dialog.css')),
  'utf8',
);
const css = [
  frameCss,
  reportCss,
  ...styles.map((name) => readFileSync(join('src', 'styles', `${name}.css`), 'utf8')),
].join('\n');
writeFileSync(join(out, 'app.css'), (await transform(css, { loader: 'css', minify: true })).code);

const copied = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon-monochrome-512.png',
];
for (const file of copied) copyFileSync(join('src', file), join(out, file));
// The page's policy comes from headers.mjs, like the `_headers` file below.
const page = readFileSync(join('src', 'index.html'), 'utf8');
if (!page.includes('{{CSP}}')) throw new Error('src/index.html lost its {{CSP}} placeholder');
writeFileSync(join(out, 'index.html'), page.replace('{{CSP}}', metaPolicy));
// Headers for hosts that read this file (Cloudflare Workers static assets);
// not precached, not part of the app (a request for it is a 404 there).
writeFileSync(join(out, '_headers'), headersFile());
// Install-dialog screenshots (manifest `screenshots`): the recorded-data
// screenshots of docs/screenshots, not precached (docs/development.md).
mkdirSync(join(out, 'screenshots'), { recursive: true });
for (const [name, source] of [
  ['drinks-360x720', 'app-drinks-list-360x720'],
  ['spec-360x720', 'app-spec-360x720'],
  ['drinks-1200x800', 'app-drinks-list-1200x800'],
  ['spec-1200x800', 'app-spec-1200x800'],
]) {
  copyFileSync(
    join('..', '..', 'docs', 'screenshots', `${source}.png`),
    join(out, 'screenshots', `${name}.png`),
  );
}
writeFileSync(join(out, 'seed', 'seed.json'), JSON.stringify(assembleSeed()));
copied.push('seed/seed.json');

// The cache is named after the files' content: a changed build replaces it.
const files = [...copied, 'main.js', 'rank-worker.js', 'theme-init.js', 'app.css'];
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(join(out, file)));
await build({
  ...common,
  entryPoints: ['src/sw.ts'],
  outfile: join(out, 'sw.js'),
  define: {
    APP_FILES: JSON.stringify(['./', ...files]),
    APP_CACHE: JSON.stringify(`mixtura-${hash.digest('hex').slice(0, 16)}`),
  },
});

let total = 0;
for (const file of [...files, 'sw.js']) {
  const { size } = statSync(join(out, file));
  total += size;
  console.log(`${String(size).padStart(8)}  ${file}`);
}
console.log(`${String(total).padStart(8)}  bytes in ${out}`);
