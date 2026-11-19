/* global caches, window -- in functions the page runs */
// An update never stores a stale file (issue #109): the host serves every
// file with `Cache-Control: max-age=600` like GitHub Pages, the app loads,
// a "new build" is published (changed main.js and a new cache name) and the
// worker installs within those ten minutes. The new cache must hold the new
// main.js, not the copy in the HTTP cache.
//
//   node e2e/update.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const site = await serve(undefined, '/', 'max-age=600');
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});

await page.goto(site.url, { waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
const before = await page.evaluate(() => caches.keys());
const oldMain = readFileSync(resolve('dist', 'main.js'), 'utf8');
expect(
  (await page.evaluate(
    async (n) => (await (await caches.open(n)).match('main.js'))?.text(),
    before[0],
  )) === oldMain,
  'the first install cached the built main.js',
);

const marker = '/* new build */';
site.overrides.set('/main.js', `${oldMain}\n${marker}`);
const sw = readFileSync(resolve('dist', 'sw.js'), 'utf8');
site.overrides.set('/sw.js', sw.replace(/mixtura-[0-9a-f]{16}/g, 'mixtura-1111111111111111'));
await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
await page.getByText('Update available').waitFor();
await page.evaluate(() => {
  window.marker = 'before the reload';
});
await page.getByRole('button', { name: 'Update', exact: true }).click();
await page.waitForFunction(() => window.marker === undefined);
await page.locator('nav.nav').waitFor();
await page.waitForFunction(() => caches.keys().then((names) => names.length === 1));
const names = await page.evaluate(() => caches.keys());
expect(names[0] === 'mixtura-1111111111111111', `the new cache is the only one: ${names}`);
const stored = await page.evaluate(
  async (n) => (await (await caches.open(n)).match('main.js'))?.text(),
  names[0],
);
expect(
  stored?.endsWith(marker) === true,
  'the new cache holds the new main.js, not the HTTP-cached old one',
);

await page.reload({ waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
const served = await page.evaluate(async () =>
  (await (await fetch('main.js')).text()).endsWith('/* new build */'),
);
expect(served, 'the page is served the new main.js');
await browser.close();
await site.close();
