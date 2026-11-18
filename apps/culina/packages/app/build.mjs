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
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'icons'), { recursive: true });

const common = { bundle: true, minify: true, target: 'es2022', logLevel: 'warning', outdir: dist };
await build({
  ...common,
  format: 'esm',
  entryPoints: { main: join(src, 'main.ts'), app: join(src, 'styles/index.css') },
});
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
