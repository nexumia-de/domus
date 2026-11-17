// Builds the app into dist/ (or the folder in MIXTURA_OUT): static files
// for any web server. main.js is the app, app.css the one stylesheet,
// sw.js the service worker with the list of all files and a cache name
// made from their content.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, transform } from 'esbuild';

const out = process.env.MIXTURA_OUT ?? 'dist';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'icons'), { recursive: true });

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
  define: { APP_VERSION: JSON.stringify(version) },
});

const styles = ['tokens', 'base', 'shell', 'components', 'app'];
const css = styles
  .map((name) => readFileSync(join('src', 'styles', `${name}.css`), 'utf8'))
  .join('\n');
writeFileSync(join(out, 'app.css'), (await transform(css, { loader: 'css', minify: true })).code);

const copied = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];
for (const file of copied) copyFileSync(join('src', file), join(out, file));

// The cache is named after the files' content: a changed build replaces it.
const files = [...copied, 'main.js', 'app.css'];
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
