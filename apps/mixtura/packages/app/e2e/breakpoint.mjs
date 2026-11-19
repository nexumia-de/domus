/* global document, getComputedStyle, innerWidth -- in functions the page runs */
// Dark mode and the 840 px breakpoint: a walk through every destination
// at 839 px (bottom bar) and 840 px (rail), in dark, checking where the
// navigation is, that the title is the destination's and nothing scrolls
// sideways. Screenshots go to dist/walk/.
//
//   node e2e/breakpoint.mjs
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });
const site = await serve();
const browser = await launch();

for (const width of [839, 840]) {
  const rail = width >= 840;
  const context = await browser.newContext({
    viewport: { width, height: 720 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    throw error;
  });
  await throttle(page, process.argv.slice(2));
  await page.goto(site.url, { waitUntil: 'load' });
  await page.locator('nav.nav').waitFor();
  expect(
    (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) ===
      'rgb(22, 19, 15)',
    `${width}: the dark tokens are applied`,
  );
  for (const name of ['Drinks', 'Templates', 'Stock', 'Settings']) {
    await page.locator('nav.nav').getByRole('link', { name, exact: true }).click();
    await page
      .locator('.pane h1:visible', { hasText: new RegExp(`^${name}$`) })
      .last()
      .waitFor();
    const box = await page.locator('nav.nav').boundingBox();
    expect(
      rail ? box.x === 0 && box.width === 88 : box.y > 360 && box.width === width,
      `${width}: ${name} with the ${rail ? 'rail' : 'bottom bar'}`,
    );
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(!wide, `${width}: no sideways scrolling on ${name}`);
    await page.screenshot({ path: join(OUT, `dark-${name.toLowerCase()}-${width}.png`) });
  }
  await page.goto(`${site.url}#/drinks/daiquiri`);
  await page
    .locator('.pane h1:visible', { hasText: /Daiquiri/ })
    .last()
    .waitFor();
  const two = await page.locator('.pane:visible').count();
  expect(rail ? two === 2 : two === 1, `${width}: ${two} pane(s) with a drink open`);
  await page.screenshot({ path: join(OUT, `dark-spec-${width}.png`) });
  await context.close();
}
await browser.close();
await site.close();
