// Serves the built app under /mixtura/ like GitHub Pages and checks that
// it loads, that manifest and service worker are scoped to the sub-path,
// that nothing is requested outside it, and that an offline reload and a
// deep link work there.
//
//   node e2e/subpath.mjs
/* global document, location, caches -- in functions the page runs */
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const site = await serve(undefined, '/mixtura/');
const origin = new URL(site.url).origin;
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});
const outside = [];
page.on('request', (request) => {
  const url = request.url();
  if (!url.startsWith('data:') && !url.startsWith(site.url)) outside.push(url);
});

await page.goto(site.url, { waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
expect(true, 'under /mixtura/ the app loads and the service worker controls the page');

const registration = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { scope: r.scope, script: r.active.scriptURL };
});
expect(registration.scope === site.url, `service worker scope is ${registration.scope}`);
expect(registration.script === `${site.url}sw.js`, 'service worker script is under /mixtura/');

const manifestUrl = await page.evaluate(() => document.querySelector('link[rel=manifest]').href);
const manifest = await (await context.request.get(manifestUrl)).json();
const resolved = (path) => new URL(path, manifestUrl).href;
expect(resolved(manifest.start_url) === site.url, 'manifest start_url resolves to /mixtura/');
expect(resolved(manifest.scope) === site.url, 'manifest scope resolves to /mixtura/');
for (const icon of manifest.icons) {
  const response = await context.request.get(resolved(icon.src));
  expect(response.ok(), `icon ${icon.src} loads under /mixtura/`);
}

const cached = await page.evaluate(async () => {
  const [name] = await caches.keys();
  return (await (await caches.open(name)).keys()).map((r) => r.url);
});
expect(
  cached.length > 0 && cached.every((url) => url.startsWith(site.url)),
  `all ${cached.length} precached files are under /mixtura/`,
);

await context.setOffline(true);
const fromNetwork = [];
page.on('response', (response) => {
  if (!response.fromServiceWorker()) fromNetwork.push(response.url());
});
await page.reload({ waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
expect(true, 'an offline reload under /mixtura/ shows the app');
await page.goto(`${site.url}#/settings`);
await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
expect(true, 'a deep link works offline under /mixtura/');
expect(fromNetwork.length === 0, `offline: all responses from the service worker ${fromNetwork}`);
expect((await page.evaluate(() => location.pathname)) === '/mixtura/', 'path stays /mixtura/');

// The ranking worker is one more precached file: Buy Next ranks offline
// under the sub-path with it, in the offline state of this script.
expect(
  cached.includes(`${site.url}rank-worker.js`),
  'the ranking worker script is precached under /mixtura/',
);
await page.goto(`${site.url}#/stock`);
await page.locator('.stock-tree').waitFor();
await page.locator('input[name="q"]').fill('gin');
await page.waitForFunction(() => location.hash.includes('q=gin'));
await page.locator('.stock-row').first().waitFor();
await page.locator('input[name="q"]').press('Enter');
await page.goto('about:blank');
await page.goto(`${site.url}#/stock/buy-next`);
await page.locator('.buy-item').first().waitFor();
expect(
  await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .some((e) => e.name.endsWith('/mixtura/rank-worker.js')),
  ),
  'Buy Next fetched the worker script from /mixtura/ through the service worker',
);
expect(
  (await page.locator('.buy-item').count()) > 0,
  'offline: the ranking is drawn from the worker',
);
await context.setOffline(false);

expect(outside.length === 0, `no request left /mixtura/ on ${origin}: ${outside}`);
await browser.close();
await site.close();
