// The app without service workers (a native wrapper that serves it from
// a local origin may not have them): the script removes
// navigator.serviceWorker and navigator.storage before the app starts, then
// browse, a spec and the local store are used, and a reload keeps the data.
//
//   node e2e/no-sw.mjs
/* global document -- in functions the page runs */
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const site = await serve(undefined, '/nested/app/');
const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 720 },
  serviceWorkers: 'block',
});
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});
await page.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'serviceWorker', { get: () => undefined });
  Object.defineProperty(Navigator.prototype, 'storage', { get: () => undefined });
});

await page.goto(`${site.url}index.html`, { waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
expect(
  await page.evaluate(() => navigator.serviceWorker === undefined && !navigator.storage),
  'the page has neither service worker nor storage API',
);

await page.goto(`${site.url}#/drinks`);
const row = page.locator('.pane.list a[href^="#/drinks/"]').first();
await row.waitFor();
expect(true, 'browse lists drinks without a service worker');
await row.click();
await page.locator('.spec .balance, .balance').first().waitFor();
expect(true, 'a spec opens with its balance numbers');

await page.goto(`${site.url}#/settings`);
await page.getByRole('button', { name: 'Dark', exact: true }).click();
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
await page.reload({ waitUntil: 'load' });
await page.locator('.fr-header h1').waitFor();
expect(
  (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark',
  'a setting written to the local store survives a reload',
);
await browser.close();
await site.close();
