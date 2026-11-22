// Walks the built app (dist/) in a fresh browser profile: the four
// destinations, back navigation, no horizontal scrolling, a reload with
// the network off, and the update flow with a second "build".
// Screenshots go to dist/walk/; with --docs also to docs/screenshots/
// at scale 2.
//
//   node e2e/walk.mjs [width height] [--docs]
/* global document, innerWidth, location, caches, window -- in functions the page runs */
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = resolve('dist', 'walk');
const DOCS = resolve('..', '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: docs ? 2 : 1,
});
const page = await context.newPage();
await throttle(page, process.argv.slice(2));
page.on('pageerror', (error) => {
  throw error;
});
const external = [];
page.on('request', (request) => {
  if (!request.url().startsWith(site.url) && !request.url().startsWith('data:')) {
    external.push(request.url());
  }
});

const phone = width < 840;
const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) });
const docShot = (name) =>
  docs ? page.screenshot({ path: join(DOCS, `${name}-${width}x${height}.png`) }) : undefined;
const dest = (name) => page.locator('nav.nav').getByRole('link', { name, exact: true });
// Settings is not a destination of the bar: it is the icon in the header.
const settingsLink = () =>
  page.locator('.fr-header').getByRole('link', { name: 'Settings', exact: true });
const title = () => page.locator('.fr-header h1').last().innerText();
/** Waits for the title: history changes arrive asynchronously. */
const titleIs = (name) =>
  page
    .locator('.fr-header h1', { hasText: new RegExp(`^${name}$`) })
    .last()
    .waitFor({ timeout: 5000 });
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(!wide, `no horizontal scrolling ${where}`);
};

await page.goto(site.url, { waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
expect((await page.evaluate(() => location.hash)) === '#/drinks', 'the empty hash opens Drinks');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
expect(true, 'the service worker controls the page');

// The three destinations, in order, as bottom navigation or rail; Settings is in the header.
const labels = await page.locator('nav.nav a').allInnerTexts();
expect(
  labels.join() === 'Drinks,Templates,Stock',
  'three destinations in order; Settings is not among them',
);
// Measured inside the page: a late redraw replaces the element, and a locator's
// boundingBox() answers null for the one it lost (seen on a slow CI runner).
const box = await page.evaluate(() => {
  const r = document.querySelector('nav.nav').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
expect(phone ? box.y > height / 2 : box.x === 0 && box.width === 88, 'bottom bar or rail');
// Also inside the page, in one step: a locator hands over elements that a late
// redraw has already replaced, and a replaced link measures 0 x 0 (seen in
// e2e-slow on pull request #144).
const linkSizes = await page.evaluate(() =>
  [...document.querySelectorAll('nav.nav a')].map((a) => {
    const r = a.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }),
);
expect(linkSizes.length === 3, 'three navigation targets are measured');
for (const size of linkSizes) {
  expect(size.width >= 44 && size.height >= 44, 'navigation target is at least 44 x 44');
}
await shot('shell');
await docShot('shell');
await noOverflow('on Drinks');

// The header: one h1 with the page title, Settings and the sync icon at least 44 x 44.
expect((await page.locator('h1').count()) === 1, 'one h1 on the page: the header title');
for (const control of [settingsLink(), page.locator('.fr-header .fr-sync')]) {
  const target = await control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  expect(target.width >= 44 && target.height >= 44, 'header action is at least 44 x 44');
}
for (const name of ['Templates', 'Stock', 'Drinks']) {
  await dest(name).click();
  expect((await title()) === name, `${name} opens with its title`);
  expect(
    (await dest(name).getAttribute('aria-current')) === 'page',
    `${name} is the current destination`,
  );
  await noOverflow(`on ${name}`);
}

// Settings: the icon in the header opens it as a page with Back; no bar entry is current.
await settingsLink().click();
await titleIs('Settings');
expect((await settingsLink().getAttribute('aria-current')) === 'page', 'Settings icon is current');
expect(
  (await page.locator('nav.nav [aria-current="page"]').count()) === 0,
  'no destination of the bar is current on Settings',
);
await noOverflow('on Settings');
await page.getByRole('button', { name: 'Back' }).click();
await titleIs('Drinks');
expect(true, 'Back from Settings returns to where it was opened');

// Pushed screen and back.
await page.getByRole('link', { name: 'New Drink' }).click();
await titleIs('New Drink');
expect(true, 'New Drink is pushed');
expect(
  phone ? !(await dest('Drinks').isVisible()) : true,
  'a pushed screen hides the bar on a phone',
);
await page.getByRole('button', { name: 'Back' }).click();
await titleIs('Drinks');
expect(true, 'Back returns to Drinks');
await page.goBack();
await page.goForward();
await titleIs('Drinks');
expect(true, 'history moves without breaking');

// A destination keeps its stack (the bar is hidden on a pushed phone screen).
await page.getByRole('link', { name: 'New Drink' }).click();
if (phone) {
  await page.keyboard.press('Escape');
  await titleIs('Drinks');
  expect(true, 'Escape goes back');
} else {
  await settingsLink().click();
  await dest('Drinks').click();
  await titleIs('New Drink');
  expect(true, 'switching back restores the pushed screen');
  await dest('Drinks').click();
  await titleIs('Drinks');
  expect(true, 'the current destination pops its stack to the list');
}

// Stock views and About.
await dest('Stock').click();
await page.getByRole('link', { name: 'Buy Next' }).click();
await titleIs('Buy Next');
expect(true, 'Buy Next opens');
await settingsLink().click();
await page.getByRole('link', { name: /About/ }).click();
await titleIs('About');
expect(true, 'About is pushed from Settings');
await page.getByRole('button', { name: 'Back' }).click();

// Unknown route.
await page.goto(`${site.url}#/nowhere`);
await page.getByRole('heading', { name: 'This page is not here' }).waitFor();
await page.getByRole('link', { name: 'Open Drinks' }).click();
await titleIs('Drinks');
expect(true, 'the not-found page leads back');

// Theme setting.
await settingsLink().click();
await page.getByRole('button', { name: 'Dark', exact: true }).click();
expect(
  (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark',
  'Dark applies at once',
);
await shot('settings-dark');
await docShot('shell-settings-dark');
await page.reload();
expect(
  (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark',
  'the theme survives a reload',
);
await page.getByRole('button', { name: 'Follow System' }).click();
await page.getByRole('button', { name: 'Back' }).click();
await titleIs('Drinks');

// Offline: a reload still shows the app, every response from the service worker.
await context.setOffline(true);
const fromNetwork = [];
page.on('response', (response) => {
  if (!response.fromServiceWorker()) fromNetwork.push(response.url());
});
await page.reload({ waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
await titleIs('Drinks');
expect(true, 'a reload with the network off shows the app');
await page.goto(`${site.url}#/settings`);
await titleIs('Settings');
expect(true, 'a deep link works offline');
expect(fromNetwork.length === 0, `offline: all responses from the service worker ${fromNetwork}`);
await context.setOffline(false);
await page.getByRole('button', { name: 'Back' }).click();
await titleIs('Drinks');

// Update flow: a changed sw.js is a new build; the banner appears and the
// page reloads only after Update.
const cacheNames = () => page.evaluate(() => caches.keys());
const before = await cacheNames();
const sw = readFileSync(resolve('dist', 'sw.js'), 'utf8');
site.overrides.set('/sw.js', sw.replace(/mixtura-[0-9a-f]{16}/g, 'mixtura-0000000000000000'));
await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
await page.getByText('Update available').waitFor();
expect(true, 'the update banner appears');
await page.evaluate(() => {
  window.marker = 'still here';
});
await page.waitForTimeout(500);
expect((await page.evaluate(() => window.marker)) === 'still here', 'no reload before Update');
await docShot('shell-update');
await page.getByRole('button', { name: 'Update', exact: true }).click();
await page.waitForFunction(() => window.marker === undefined);
await page.locator('nav.nav').waitFor();
expect((await page.getByText('Update available').count()) === 0, 'the banner is gone after Update');
const after = await cacheNames();
expect(
  after.length === 1 && after[0] === 'mixtura-0000000000000000' && after[0] !== before[0],
  `the old cache was deleted ${before} -> ${after}`,
);

expect(external.length === 0, `no request left the origin ${external}`);
await browser.close();
await site.close();
