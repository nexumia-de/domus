// Dark mode screenshots of the main screens, the same screens as in light
// (docs/screenshots.md). Nothing is asserted beyond the page being drawn:
// the dark colours are checked by e2e/a11y.mjs.
//
//   node e2e/dark.mjs [width height] [--docs]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = resolve('dist', 'walk');
const DOCS = resolve('..', '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const screens = [
  ['drinks', '#/drinks'],
  ['templates', '#/templates'],
  ['template', '#/templates/daiquiri'],
  ['spec', '#/drinks/daiquiri'],
  ['swap', '#/drinks/daiquiri?swap=2::25ml'],
  ['stock', '#/stock'],
  ['buy-next-empty', '#/stock/buy-next'],
  ['settings', '#/settings'],
  ['sync', '#/settings/sync'],
  ['sync-storage', '#/settings/sync?sheet=storage'],
];

const site = await serve();
const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: docs ? 2 : 1,
  colorScheme: 'dark',
});
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});
await throttle(page, args);
for (const [name, address] of screens) {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
  if (name === 'drinks') await page.locator('.list-rows li').first().waitFor();
  const file = `dark-${name}-${width}x${height}.png`;
  await page.screenshot({ path: join(OUT, file) });
  if (docs) await page.screenshot({ path: join(DOCS, file) });
  expect(true, `${name} drawn in dark`);
}
await browser.close();
await site.close();
