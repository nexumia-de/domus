// Builds the app into dist/: `npm run build -w @culina/app`.
// Fixed file names, all URLs relative (the app works from a sub-path). The
// service worker gets the exact list of built files and a cache version
// derived from their content.
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { compileSchemas } from './compile-schemas.mjs';
import { makeClassics, packContent, shippedContent } from './make-classics.mjs';
import { makeTechniques } from '../engine/scripts/make-techniques.mjs';
import { makeSubstitutes } from '../engine/scripts/make-substitutes.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
    )
    .sort();

compileSchemas();
makeClassics();
makeTechniques();
makeSubstitutes();
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'icons'), { recursive: true });

const common = { bundle: true, minify: true, target: 'es2022', logLevel: 'warning', outdir: dist };
const mainEntry = { main: join(src, 'main.ts'), app: join(src, 'styles/index.css') };
const handOverEntry = { 'hand-over': join(src, 'screens/hand-over/confirm.ts') };
// CULINA_GITHUB_API is for the browser checks only: a test build that talks to a fake of
// GitHub's API. Every other build has https://api.github.com compiled in (src/env.ts).
const githubApi = process.env.CULINA_GITHUB_API
  ? { __GITHUB_API__: JSON.stringify(process.env.CULINA_GITHUB_API) }
  : {};
// The build both main.js and hand-over.js carry: a hash of every source file either is made of,
// so the same sources give the same id. main.js refuses a hand-over.js of another build (the
// service worker can hand an updated file to a page that is still open).
const buildId = async () => {
  const hash = createHash('sha256');
  const inputs = new Set();
  for (const entryPoints of [mainEntry, handOverEntry]) {
    const probe = await build({
      ...common,
      format: 'esm',
      entryPoints,
      write: false,
      metafile: true,
    });
    for (const input of Object.keys(probe.metafile.inputs)) inputs.add(input);
  }
  for (const input of [...inputs].sort())
    hash.update(input).update('\0').update(readFileSync(input));
  hash.update(JSON.stringify(githubApi));
  return hash.digest('hex').slice(0, 16);
};
const define = { ...githubApi, __BUILD_ID__: JSON.stringify(await buildId()) };
await build({ ...common, format: 'esm', entryPoints: mainEntry, define });
// The hand-over to the shopping list (src/screens/hand-over/confirm.ts): a module of its own,
// loaded by main.js when the cook first opens the confirmation and precached like the rest. It
// carries the list package's rules and usual items, which main.js does not (test/build.test.ts).
// It shares no module state with main.js: what it needs of the running app comes in as arguments.
await build({ ...common, format: 'esm', entryPoints: handOverEntry, define });
// Classic script: it runs before the stylesheet to set the theme without a flash.
await build({
  ...common,
  format: 'iife',
  entryPoints: { 'theme-init': join(src, 'theme-init.ts') },
});

cpSync(join(src, 'index.html'), join(dist, 'index.html'));
cpSync(join(src, 'manifest.webmanifest'), join(dist, 'manifest.webmanifest'));
// The generated ingredient catalogue is its own file, fetched on first use of the picker and
// precached; main.js does not carry it. Written without the whitespace of the source file.
writeFileSync(
  join(dist, 'catalogue.json'),
  JSON.stringify(JSON.parse(readFileSync(join(root, 'data', 'ingredient-catalogue.json'), 'utf8'))),
);
// The pairing data (derived from FlavorDB, CC BY-NC-SA 3.0, docs/decisions/flavordb.md) and the
// links from the catalogue to it: files of their own, fetched when a dish's "Goes with" is first
// opened and precached; main.js carries neither.
for (const [from, to] of [
  ['flavour-pairings.json', 'pairings.json'],
  ['flavour-links.json', 'pairing-links.json'],
]) {
  writeFileSync(
    join(dist, to),
    JSON.stringify(JSON.parse(readFileSync(join(root, 'data', from), 'utf8'))),
  );
}
// The shipped classics, technique notes and handling rules, read from the data folders: its own file too, loaded
// at start and precached; main.js carries none of them.
writeFileSync(join(dist, 'classics.json'), JSON.stringify(shippedContent()));
// The import pack: dishes offered to the user, not shown until taken (docs/decisions/bases-and-pack.md);
// precached like the rest, so taking it works offline. Not fetched at start.
writeFileSync(join(dist, 'classics-pack.json'), JSON.stringify(packContent()));
for (const name of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
  cpSync(join(src, 'assets', name), join(dist, 'icons', name));
}

const files = listFiles(dist).map((file) => relative(dist, file).split('\\').join('/'));
const hash = createHash('sha256');
for (const file of files)
  hash
    .update(file)
    .update('\0')
    .update(readFileSync(join(dist, file)));
const version = hash.digest('hex').slice(0, 16);

await build({
  ...common,
  format: 'iife',
  entryPoints: { sw: join(src, 'sw.ts') },
  define: { PRECACHE_FILES: JSON.stringify(files), CACHE_VERSION: JSON.stringify(version) },
});

const total = [...files, 'sw.js'].reduce((sum, file) => sum + statSync(join(dist, file)).size, 0);
console.log(
  `dist: ${files.length + 1} files, ${Math.round(total / 1024)} kB, cache culina-${version}`,
);
