/* global caches -- in functions the page runs */
// Cloudflare Workers static assets redirect /index.html to / (307). The
// service worker precaches index.html through that redirect and must not
// answer a navigation with a redirected response, which the browser refuses
// (docs/deployment.md). Opens /index.html and an unknown path online and
// offline with the worker in control.
//
//   node e2e/index-redirect.mjs [width height]
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const [width = 360, height = 720] = process.argv
  .slice(2)
  .filter((a) => /^\d+$/.test(a))
  .map(Number);
const site = await serve(undefined, '/', undefined, { redirectIndex: true });
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();

await page.goto(site.url, { waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
const redirected = await page.evaluate(async () => {
  const [name] = await caches.keys();
  return (await (await caches.open(name)).match('index.html'))?.redirected;
});
expect(redirected === true, 'index.html was precached through the redirect (the case to cover)');

const opens = async (path, label) => {
  const response = await page.goto(`${site.url}${path}`, { waitUntil: 'load' });
  await page.locator('.fr-header h1').waitFor();
  expect(response?.status() === 200, `${label}: the app opens`);
};
await opens('index.html#/settings', 'online, index.html');
await opens('nowhere', 'online, an unknown path');
await context.setOffline(true);
await opens('index.html#/settings', 'offline, index.html');
await opens('nowhere', 'offline, an unknown path');

await browser.close();
await site.close();
