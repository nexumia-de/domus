// Spaces on the Stock screen in a real browser: one space looks as before
// (the space the app made, on this device only); a second space with stock,
// as the Household app would have made it, is listed and counts at once after
// a reload; rows name the spaces that have an ingredient; the entry space
// moves; unticking a space changes the count; refusals are said in words; a
// reload keeps it all. Mixtura cannot add, rename or remove a space: the sheet
// has no such control and links to the Household app. No horizontal scrolling
// and targets of 44 px at both sizes. Screenshots go to dist/walk/; with
// --docs also to docs/screenshots/ as app-stock-spaces-*.png.
//
//   node e2e/spaces.mjs [width height] [--docs]
/* global document, indexedDB, window, location -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';
import { addSpace, presentIds, readSpaces, seedStock } from './stock-db.mjs';

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
page.on('pageerror', (error) => {
  throw error;
});
await throttle(page, args);
page.setDefaultTimeout(15000);

const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) });
const docShot = async (name) => {
  if (!docs) return;
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  await page.screenshot({ path: join(DOCS, `app-${name}-${width}x${height}.png`) });
};
const toast = () => page.getByTestId('toast');
const inStock = async () => {
  await page.locator('.stock-summary strong').waitFor();
  return Number(/^(\d+)/.exec(await page.locator('.stock-summary strong').innerText())?.[1] ?? NaN);
};
const waitInStock = (n) =>
  page.waitForFunction(
    (count) => document.querySelector('.stock-summary strong')?.textContent === `${count} in stock`,
    n,
  );
const waitLine = (text) =>
  page.waitForFunction(
    (t) => document.querySelector('[data-spaces-line]')?.textContent === t,
    text,
  );
const sheet = () => page.locator('[data-sheet="spaces"]');
const row = (name) =>
  page
    .locator('li.space-row')
    .filter({ has: page.locator('[data-space-name]', { hasText: name }) });
const problem = () => page.locator('[data-spaces-problem]');
const goto = async (hash) => {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await page.locator('.stock-tree, .status').first().waitFor();
};
const rowSpaces = (id) =>
  page.evaluate(
    (ing) => document.querySelector(`[data-row="${ing}"] [data-spaces]`)?.textContent ?? null,
    id,
  );
const rowChecked = (id) =>
  page.evaluate(
    (ing) => document.querySelector(`[data-toggle="${ing}"]`)?.getAttribute('aria-checked'),
    id,
  );
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > window.innerWidth) return 'page';
    for (const el of document.querySelectorAll('.pane-scroll, .sheet-scroll')) {
      if (el.scrollWidth > el.clientWidth + 1) return 'scroll area';
    }
    return '';
  });
  expect(wide === '', `no horizontal scrolling ${where} ${wide}`);
};
// Measured inside the page: a locator can hand over an element a redraw has replaced.
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    const scope = document.querySelector('[data-sheet]') ?? document;
    for (const el of scope.querySelectorAll(
      'a, button, input, [role="checkbox"], [role="radio"]',
    )) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (box.height < 43.5 || box.width < 43.5) {
        bad.push(`${el.tagName} ${el.textContent.trim().slice(0, 20)} ${box.width}x${box.height}`);
      }
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};
const openSheet = async () => {
  await page.getByRole('button', { name: 'Spaces', exact: true }).click();
  await sheet().waitFor();
};
const closeSheet = async () => {
  await sheet().getByRole('button', { name: 'Close' }).click();
  await sheet().waitFor({ state: 'detached' });
};
const closeSheet2 = async () => {
  await page.locator('[data-sheet="batches"]').getByRole('button', { name: 'Close' }).click();
  await page.locator('[data-sheet="batches"]').waitFor({ state: 'detached' });
};
/** The device setting `spaces` of Mixtura's own database: `{ ticked, entry, known }`. */
const setting = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const get = r.result.transaction('settings').objectStore('settings').get('spaces');
          get.onsuccess = () => {
            r.result.close();
            res(get.result?.value ?? null);
          };
        };
      }),
  );
/** Waits for something that is written behind the screen (a setting, a stock record). */
const stored = async (read, test, what) => {
  for (let tries = 0; tries < 100; tries++) {
    if (test(await read())) return expect(true, what);
    await page.waitForTimeout(50);
  }
  expect(false, what);
};
const checked = (name, role) => row(name).locator(`[role="${role}"]`).getAttribute('aria-checked');

// ---- One space: the screen looks as before ----
await page.goto(`${site.url}#/stock`, { waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await waitLine('Home');
expect(
  (await page.locator('.spaces-line button').innerText()) === 'Spaces',
  'the line has a Spaces button',
);
expect((await page.locator('[data-spaces]').count()) === 0, 'no space name on rows with one space');
await noOverflow('on Stock with one space');
await targets('on Stock with one space');
await docShot('stock-spaces-line');
await shot('stock-spaces-line');
const [home] = await readSpaces(page);
expect(
  (await readSpaces(page)).length === 1 &&
    home.name === 'Home' &&
    /^[0-9a-f]{32}$/.test(home.id) &&
    home.storage.type === 'device' &&
    home.storage.address === '',
  'the app made one space, Home, on this device only',
);

await goto('#/stock?q=lime juice');
await page.locator('[data-toggle="lime-juice"]').click();
await waitInStock(1);
expect((await rowSpaces('lime-juice')) === null, 'one space: still no space name after a mark');
await stored(
  () => presentIds(page, home.id),
  (ids) => ids.join() === 'lime-juice',
  'the mark is a record of the space',
);

// ---- The sheet: opens without the keyboard, lists Home, refuses what it must ----
await openSheet();
// The sheet takes the focus in the next animation frame; on a slow device that
// is later than this line (e2e-slow on pull request #147), so wait for it. A
// text field taking the focus instead makes this time out.
await page.waitForFunction(() => document.activeElement?.getAttribute('data-sheet') === 'spaces');
expect(true, 'the sheet takes the focus, not a text field');
expect((await page.locator('li.space-row').count()) === 1, 'one space is listed');
expect((await checked('Home', 'checkbox')) === 'true', 'Home counts');
expect((await checked('Home', 'radio')) === 'true', 'Home gets new entries');
expect(
  (await row('Home').locator('[data-space-sync]').innerText()) === 'On this device only',
  'the space says that it is on this device only',
);
// Spaces are made, named and removed in the Household app: no such control here.
const noControls = async (where) => {
  const found = await sheet().evaluate((el) =>
    [...el.querySelectorAll('input, textarea, select, button, a')]
      .map((c) => `${c.getAttribute('aria-label') ?? ''} ${c.textContent}`.trim())
      .filter((name) => /\b(add|rename|remove|delete|new space)\b/i.test(name)),
  );
  expect(
    found.length === 0 && (await sheet().locator('input, textarea, select').count()) === 0,
    `no field and no Add, Rename or Remove in the sheet ${where} ${found}`,
  );
};
await noControls('with one space');
const household = sheet().getByRole('link', { name: 'Open Household' });
expect(
  (await household.getAttribute('href')) === '../' &&
    (await household.getAttribute('data-focus')) === 'spaces-household',
  'the sheet links to the Household app, one folder up',
);
await row('Home').locator('[role="checkbox"]').click();
await problem().waitFor();
expect(
  /At least one space has to count/.test(await problem().innerText()),
  'unticking the last space is refused in words',
);
expect((await checked('Home', 'checkbox')) === 'true', 'and Home still counts');
await noOverflow('in the Spaces sheet with one space');
await targets('in the Spaces sheet with one space');
await closeSheet();
await page.waitForFunction(() => document.activeElement?.getAttribute('data-focus') === 'spaces');
expect(true, 'focus returns to the Spaces button');

// ---- A second space, as the Household app would make it: listed and counting at once ----
const parents = await addSpace(page, 'Parents');
await seedStock(page, ['bourbon-whiskey'], { space: parents });
// Nothing is read again while the page stays open and in front.
await page.reload({ waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await waitLine('Home · Parents');
await waitInStock(2);
expect(true, 'after a reload the new space counts: its stock is in the sum');
await stored(
  setting,
  (v) =>
    v?.entry === home.id &&
    v.ticked.length === 2 &&
    v.ticked.includes(parents) &&
    [...v.known].sort().join() === [home.id, parents].sort().join(),
  'the device setting ticks and knows the new space; new entries stay at Home',
);
await openSheet();
expect((await page.locator('li.space-row').count()) === 2, 'the new space is listed');
expect((await checked('Parents', 'checkbox')) === 'true', 'the new space counts');
expect((await checked('Home', 'radio')) === 'true', 'new entries still go to Home');
expect(
  (await row('Parents').locator('[data-space-sync]').innerText()) === 'On this device only',
  'the new space says how it is kept',
);
await noControls('with two spaces');
await noOverflow('in the Spaces sheet');
await targets('in the Spaces sheet');
await docShot('stock-spaces-sheet');
await shot('stock-spaces-sheet');

// The entry space cannot stop counting; another space can.
await row('Home').locator('[role="checkbox"]').click();
await page.waitForFunction(() =>
  /New entries go to Home/.test(document.querySelector('[data-spaces-problem]')?.textContent ?? ''),
);
expect(true, 'unticking the entry space is refused in words');
expect((await checked('Home', 'checkbox')) === 'true', 'and the entry space still counts');
await row('Parents').locator('[role="radio"]').click();
await page.waitForFunction(() => !document.querySelector('[data-spaces-problem]'));
expect((await checked('Parents', 'radio')) === 'true', 'new entries go to Parents now');
expect((await checked('Home', 'radio')) === 'false', 'and no longer to Home');
await stored(setting, (v) => v?.entry === parents, 'the entry space is kept on the device');
await closeSheet();
await page.waitForFunction(() => document.activeElement?.getAttribute('data-focus') === 'spaces');
await waitLine('Home · Parents');

// ---- Rows name the spaces; a mark goes to the entry space ----
await goto('#/stock?q=bourbon');
expect((await rowSpaces('bourbon-whiskey')) === 'Parents', 'a row names the space that has it');
await goto('#/stock?q=simple syrup');
await page.locator('[data-toggle="simple-syrup"]').click();
await waitInStock(3);
expect(
  (await rowSpaces('simple-syrup')) === 'Parents',
  'the mark went to the entry space, Parents',
);
await stored(
  () => presentIds(page, parents),
  (ids) => ids.join() === 'bourbon-whiskey,simple-syrup',
  'and is a record of that space, beside the one seeded',
);
expect((await presentIds(page, home.id)).join() === 'lime-juice', 'Home holds what it held');
await seedStock(page, ['bourbon-whiskey'], { space: home.id });
await page.reload({ waitUntil: 'load' });
await goto('#/stock?q=bourbon');
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="bourbon-whiskey"] [data-spaces]')?.textContent ===
    'Home · Parents',
);
expect(true, 'a row present in both names both, joined with a dot');
await waitLine('Home · Parents');
await waitInStock(3);
expect(true, 'an ingredient in two spaces counts once');
await shot('stock-spaces-rows');
await docShot('stock-spaces-rows');

// Unmarking while another space still has it says so and keeps the check mark.
await page.locator('[data-toggle="bourbon-whiskey"]').click();
await toast().filter({ hasText: 'Still in stock at Home' }).waitFor();
expect((await rowChecked('bourbon-whiskey')) === 'true', 'the check mark stays: Home still has it');
expect((await rowSpaces('bourbon-whiskey')) === 'Home', 'the row now names Home only');
await toast().getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="bourbon-whiskey"] [data-spaces]')?.textContent ===
    'Home · Parents',
);
expect(true, 'Undo puts the entry space back');

// An ingredient only the other space has: the check box adds it to the entry space.
await goto('#/stock?q=lime juice');
await page.waitForFunction(
  () => document.querySelector('[data-row="lime-juice"] [data-spaces]')?.textContent === 'Home',
);
await targets('with the spaces line on a row');
await page.locator('[data-toggle="lime-juice"]').click();
await toast().filter({ hasText: 'Added at Parents' }).waitFor();
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="lime-juice"] [data-spaces]')?.textContent ===
    'Home · Parents',
);
expect(
  (await rowChecked('lime-juice')) === 'true',
  'the check mark does not change, the toast says where it went',
);
// The names line opens one block per counting space; this is how another space's record changes.
const namesButton = page.getByRole('button', { name: /^Spaces for Lime Juice$/i });
await namesButton.click();
await page.locator('[data-sheet="batches"]').waitFor();
const block = (name) =>
  page.locator('[data-space-block]').filter({ has: page.locator('h3', { hasText: name }) });
expect((await page.locator('[data-space-block]').count()) === 2, 'one block per counting space');
await targets('in the per-space sheet');
await docShot('stock-spaces-detail');
await shot('stock-spaces-detail');
await block('Home').locator('[data-space-state]').click();
await page.waitForFunction(() =>
  document.querySelector('[data-space-block] [data-space-state][aria-checked="false"]'),
);
await closeSheet2();
await page.waitForFunction(
  () => document.querySelector('[data-row="lime-juice"] [data-spaces]')?.textContent === 'Parents',
);
expect(true, 'unmarked at Home through its block: only the entry space remains');
await page.waitForFunction(
  () => document.activeElement?.getAttribute('data-focus') === 'spaces:lime-juice',
);
expect(true, 'focus returns to the names line');
// Back to Home only: mark Home, unmark Parents.
await page.getByRole('button', { name: /^Spaces for Lime Juice$/i }).click();
await page.locator('[data-sheet="batches"]').waitFor();
await block('Home').locator('[data-space-state]').click();
await page.waitForFunction(() =>
  document.querySelector('[data-space-block] [data-space-state][aria-checked="true"]'),
);
await block('Parents').locator('[data-space-state]').click();
await closeSheet2();
await page.waitForFunction(
  () => document.querySelector('[data-row="lime-juice"] [data-spaces]')?.textContent === 'Home',
);
expect(true, 'back to Home only');
await stored(
  async () => [await presentIds(page, home.id), await presentIds(page, parents)].join(' | '),
  (ids) => ids === 'bourbon-whiskey,lime-juice | bourbon-whiskey,simple-syrup',
  'each space holds its own records after the changes through the blocks',
);

// ---- Unticking a space changes what counts ----
await goto('#/stock');
expect((await inStock()) === 3, 'three ingredients in stock with both spaces');
const both = await page.locator('.stock-summary').innerText();
await openSheet();
await row('Home').locator('[role="checkbox"]').click();
await waitInStock(2);
expect(
  (await page.locator('.stock-summary').innerText()) !== both,
  'the summary and makeable line changed',
);
await waitLine('Parents');
expect(
  (await page.locator('[data-spaces]').count()) === 0,
  'one counting space again: no names on rows',
);
expect((await page.locator('li.space-row').count()) === 2, 'the sheet still lists both spaces');
await stored(
  setting,
  (v) => v?.ticked.join() === parents && v.known.length === 2,
  'the device keeps that Home does not count',
);

// ---- A reload keeps everything: a space the device knows is not ticked again ----
await page.reload({ waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await waitLine('Parents');
await waitInStock(2);
expect(true, 'a reload keeps the space that does not count and the stock');
await sheet().waitFor();
expect(true, 'the sheet is in the address: a reload opens it again');
expect((await page.locator('li.space-row').count()) === 2, 'both spaces are listed after a reload');
expect((await checked('Home', 'checkbox')) === 'false', 'Home still does not count');
expect((await checked('Parents', 'radio')) === 'true', 'new entries still go to Parents');
await row('Home').locator('[role="checkbox"]').click();
await waitInStock(3);
await waitLine('Home · Parents');
expect(true, 'ticking Home again brings its stock back');
await closeSheet();
await noOverflow('after the reload');
expect(
  (await presentIds(page, home.id)).join() === 'bourbon-whiskey,lime-juice',
  'the space that did not count kept its stock',
);
expect((await readSpaces(page)).length === 2, 'no space was made or removed on the way');

// ---- Settings: a row to the Household app where the Sync page was ----
await page.evaluate(() => {
  location.hash = '#/settings';
});
const link = page.locator('a.row, a').filter({ hasText: 'Household' }).first();
await link.waitFor();
expect((await link.getAttribute('href')) === '../', 'Settings links to the Household app');
expect(
  (await page.locator('a[href*="settings/sync"]').count()) === 0,
  'and has no Sync page any more',
);

await browser.close();
await site.close();
