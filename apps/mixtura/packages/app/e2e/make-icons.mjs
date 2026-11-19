// Renders the PNG icons from the SVG sources in src/icons/ with the
// browser Playwright drives. Run by hand when an SVG changes; the PNGs
// are committed (docs/design.md#app-icons).
//
//   node e2e/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './browser.mjs';

const dir = join('src', 'icons');
const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['icon-monochrome.svg', 'icon-monochrome-512.png', 512],
];
const browser = await launch();
for (const [source, target, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(join(dir, source), 'utf8').replace(
    '<svg ',
    `<svg width="${size}" height="${size}" `,
  );
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  writeFileSync(join(dir, target), await page.screenshot({ omitBackground: true }));
  await page.close();
  console.log(`wrote ${target}`);
}
await browser.close();
