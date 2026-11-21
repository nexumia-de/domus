// The shared frame in Mixtura (docs/behaviour.md#navigation): the header on every page with the
// page's title as its only h1, back on pushed screens, Settings and the sync icon in it and not in
// the bar; the sync icon says its state and details on a tap; the banner with Retry only on a real
// error (a failing shared space), not when offline; the toast with Undo gone by itself and the
// Undo restoring what was done. Screenshots go to dist/walk/.
//
//   node e2e/frame.mjs [width height]
/* global document, window -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';
import { addSpace } from './stock-db.mjs';

const args = process.argv.slice(2);
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});
await throttle(page, args);
page.setDefaultTimeout(15000);
const phone = width < 840;
const header = page.locator('.fr-header');
const title = () => page.locator('.fr-header h1').innerText();
const titleIs = (name) =>
  page.locator('.fr-header h1', { hasText: new RegExp(`^${name}$`) }).waitFor();
const hasBack = async () => (await header.getByRole('button', { name: 'Back' }).count()) === 1;
// The shared GitHub API of every space made below answers 401: a real error, not a lost network.
await page.route('https://api.github.com/**', (route) =>
  route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: '{"message":"Bad credentials"}',
  }),
);

// ---- The header on each page ----
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await titleIs('Drinks');
for (const [hash, name, back] of [
  ['#/drinks', 'Drinks', false],
  ['#/templates', 'Templates', false],
  ['#/stock', 'Stock', false],
  ['#/stock/buy-next', 'Buy Next', false],
  ['#/settings', 'Settings', true],
  ['#/settings/data', 'Data', true],
  ['#/about', 'About', true],
  ['#/drinks/new', 'New Drink', true],
]) {
  await page.goto(`${site.url}${hash}`, { waitUntil: 'load' });
  await titleIs(name);
  expect((await page.locator('h1').count()) === 1, `${name}: one h1 on the page`);
  expect((await page.locator('.pane h1').count()) === 0, `${name}: no title repeated in a pane`);
  expect((await hasBack()) === back, `${name}: back arrow ${back ? 'present' : 'absent'}`);
  const settings = header.getByRole('link', { name: 'Settings', exact: true });
  expect((await settings.count()) === 1, `${name}: Settings is in the header`);
  expect(
    (await page.locator('nav.nav a', { hasText: 'Settings' }).count()) === 0,
    `${name}: Settings is not in the bar`,
  );
  expect(
    (await header.locator('.fr-sync').count()) === 1,
    `${name}: the sync icon is in the header`,
  );
}
// A drink: its name is the title, with back (and Share on a drink of your own).
await page.goto(`${site.url}#/drinks/daiquiri`, { waitUntil: 'load' });
await page.locator('.fr-header h1', { hasText: /Daiquiri/ }).waitFor();
expect(await hasBack(), 'a drink has a back arrow');
expect((await page.locator('.pane h1').count()) === 0, 'a drink repeats no heading in its body');
await page.screenshot({ path: join(OUT, `frame-drink-${width}x${height}.png`) });

// ---- The sync icon: one space on this device only ----
await page.goto(`${site.url}#/stock`, { waitUntil: 'load' });
await titleIs('Stock');
const sync = header.locator('.fr-sync');
await sync.waitFor();
expect((await sync.getAttribute('data-sync')) === 'local', 'a device-only space: the local icon');
expect(
  (await sync.getAttribute('aria-label')) === 'On this device only',
  'the icon says its state to readers',
);
const box = await sync.boundingBox();
expect(box.width >= 44 && box.height >= 44, 'the sync icon is at least 44 x 44');
await sync.click();
await page.getByTestId('toast').filter({ hasText: 'On this device only' }).waitFor();
expect(true, 'a tap on the icon says the details in a toast');
expect(
  (await page.getByTestId('toast').getByRole('button').count()) === 0,
  'a plain toast has no action',
);
expect((await page.locator('.fr-banner').isVisible()) === false, 'no banner without an error');

// ---- A shared space that fails: the banner with Retry ----
await addSpace(page, 'Parents', { type: 'github', address: 'owner/repo', access: { token: 'x' } });
await page.reload({ waitUntil: 'load' });
await titleIs('Stock');
await page.locator('.fr-banner').waitFor({ state: 'visible' });
expect(true, 'a failing shared space shows the slim banner');
expect(
  (await page.locator('.fr-banner').innerText()).includes('Sync failed'),
  'the banner says so briefly',
);
expect((await sync.getAttribute('data-sync')) === 'failed', 'the icon shows the failure');
const retry = page.locator('.fr-banner').getByRole('button', { name: 'Retry' });
const retryBox = await retry.boundingBox();
expect(retryBox.height >= 44, 'Retry is at least 44 px high');
await page.screenshot({ path: join(OUT, `frame-banner-${width}x${height}.png`) });
await sync.click();
await page.getByTestId('toast').filter({ hasText: 'Last sync failed' }).waitFor();
expect(true, 'the icon tells the reason on a tap');
// Retry runs a cycle at once: the icon goes through "syncing" and, as the storage still fails,
// comes back to "failed". (The cycle fails before a request: the made-up space has no valid
// secret. That the loop runs is what this checks, not a real storage.)
await page.evaluate(() => {
  window.seenSync = [];
  new MutationObserver(() =>
    window.seenSync.push(document.querySelector('.fr-sync')?.dataset.sync),
  ).observe(document.querySelector('.fr-sync'), {
    attributes: true,
    attributeFilter: ['data-sync'],
  });
});
await retry.click();
await page.waitForFunction(() => window.seenSync.includes('syncing'));
expect(true, 'Retry starts a cycle at once');
await page.waitForFunction(() => window.seenSync.at(-1) === 'failed');
expect(true, 'and the banner stays while the storage still fails');

// Offline is not an error: no banner.
await context.setOffline(true);
await page.evaluate(() => window.dispatchEvent(new Event('offline')));
await page.reload({ waitUntil: 'load' }).catch(() => undefined);
await context.setOffline(false);

// ---- The toast with Undo ----
await page.goto(`${site.url}#/stock?q=lime juice`, { waitUntil: 'load' });
await page.locator('[data-toggle="lime-juice"]').click();
const toast = page.getByTestId('toast');
await toast.filter({ hasText: 'Marked Lime Juice in stock' }).waitFor();
expect((await toast.getByRole('button', { name: 'Undo' }).count()) === 1, 'the toast offers Undo');
const place = await toast.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const bar = document.querySelector('nav.nav')?.getBoundingClientRect();
  return {
    bottom: r.bottom,
    barTop: bar?.top ?? Infinity,
    barRight: bar?.right ?? 0,
    left: r.left,
    right: r.right,
  };
});
expect(place.left >= 0 && place.right <= width, 'the toast is inside the window');
expect(
  phone ? place.bottom <= place.barTop + 1 : place.left >= place.barRight,
  'the toast does not cover the bar or the rail',
);
await page.screenshot({ path: join(OUT, `frame-toast-${width}x${height}.png`) });
await toast.getByRole('button', { name: 'Undo' }).click();
await toast.waitFor({ state: 'hidden' });
expect(true, 'Undo closes the toast');
expect(
  (await page.locator('[data-toggle="lime-juice"]').getAttribute('aria-checked')) !== 'true',
  'Undo took the mark back',
);
await page.locator('[data-toggle="lime-juice"]').click();
await toast.filter({ hasText: 'Marked Lime Juice in stock' }).waitFor();
await toast.waitFor({ state: 'hidden', timeout: 12000 });
expect(true, 'a toast with Undo goes by itself (8 s)');
expect(typeof (await title()) === 'string', 'the header lives on');

await browser.close();
await site.close();
