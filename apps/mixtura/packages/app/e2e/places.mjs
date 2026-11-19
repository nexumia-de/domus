// Places on the Stock screen in a real browser (#131): one place looks as
// before; a second place is added, becomes the entry place and counts with the
// first; rows name the places that have an ingredient; unticking a place
// changes the count; the entry place moves; a place is renamed and removed
// with and without Undo; refusals are said in words; a reload keeps it all.
// No horizontal scrolling and targets of 44 px at both sizes. Screenshots go
// to dist/walk/; with --docs also to docs/screenshots/ as app-stock-places-*.png.
//
//   node e2e/places.mjs [width height] [--docs]
/* global document, indexedDB, window, location -- in functions the page runs */
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
    (t) => document.querySelector('[data-places-line]')?.textContent === t,
    text,
  );
const sheet = () => page.locator('[data-sheet="places"]');
const row = (name) =>
  page
    .locator('li.place-row')
    .filter({ has: page.locator('[data-place-name]', { hasText: name }) });
const problem = () => page.locator('[data-places-problem]');
const goto = async (hash) => {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await page.locator('.stock-tree, .status').first().waitFor();
};
const rowPlaces = (id) =>
  page.evaluate(
    (ing) => document.querySelector(`[data-row="${ing}"] [data-places]`)?.textContent ?? null,
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
  await page.getByRole('button', { name: 'Places', exact: true }).click();
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
const seed = (placeName, ingredientId) =>
  page.evaluate(
    ([name, id]) =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const tx = r.result.transaction(['stock', 'places'], 'readwrite');
          const places = tx.objectStore('places').getAll();
          places.onsuccess = () => {
            const place = places.result.find((p) => p.name === name);
            tx.objectStore('stock').put({
              placeId: place.id,
              ingredientId: id,
              updatedAt: '2026-11-18T08:00:00Z',
              present: true,
            });
          };
          tx.oncomplete = () => {
            r.result.close();
            res();
          };
        };
      }),
    [placeName, ingredientId],
  );
page.waitForFunction(() => !document.querySelector('[data-testid="toast"]') || true);

// ---- One place: the screen looks as before ----
await page.goto(`${site.url}#/stock`, { waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await waitLine('Home');
expect(
  (await page.locator('.places-line button').innerText()) === 'Places',
  'the line has a Places button',
);
expect((await page.locator('[data-places]').count()) === 0, 'no place name on rows with one place');
await noOverflow('on Stock with one place');
await targets('on Stock with one place');
await docShot('stock-places-line');
await shot('stock-places-line');

await goto('#/stock?q=lime juice');
await page.locator('[data-toggle="lime-juice"]').click();
await waitInStock(1);
expect((await rowPlaces('lime-juice')) === null, 'one place: still no place name after a mark');

// ---- The sheet: opens without the keyboard, lists Home, refuses what it must ----
await openSheet();
// The sheet takes the focus in the next animation frame; on a slow device that
// is later than this line (e2e-slow on pull request #147), so wait for it. A
// text field taking the focus instead makes this time out.
await page.waitForFunction(() => document.activeElement?.getAttribute('data-sheet') === 'places');
expect(true, 'the sheet takes the focus, not a text field');
expect((await page.locator('li.place-row').count()) === 1, 'one place is listed');
expect(
  (await row('Home').locator('[role="checkbox"]').getAttribute('aria-checked')) === 'true',
  'Home counts',
);
expect(
  (await row('Home').locator('[role="radio"]').getAttribute('aria-checked')) === 'true',
  'Home gets new entries',
);
expect(
  await row('Home').getByRole('button', { name: 'Remove Home' }).isDisabled(),
  'the only place cannot be removed',
);
await row('Home').locator('[role="checkbox"]').click();
await problem().waitFor();
expect(
  /At least one place has to count/.test(await problem().innerText()),
  'unticking the last place is refused in words',
);

// ---- Add a place; empty and repeated names are refused ----
await page.locator('#place-add').fill('  ');
await sheet().getByRole('button', { name: 'Add Place' }).click();
await page.waitForFunction(() =>
  /Enter a name/.test(document.querySelector('[data-places-problem]')?.textContent ?? ''),
);
await page.locator('#place-add').fill('home');
await page.locator('#place-add').press('Enter');
await page.waitForFunction(() =>
  /exists already/.test(document.querySelector('[data-places-problem]')?.textContent ?? ''),
);
await page.locator('#place-add').fill('Parents');
await page.locator('#place-add').press('Enter');
await row('Parents').waitFor();
expect((await page.locator('li.place-row').count()) === 2, 'the new place is listed');
expect(
  (await row('Parents').locator('[role="checkbox"]').getAttribute('aria-checked')) === 'true',
  'the new place counts',
);
expect(
  (await row('Home').locator('[role="radio"]').getAttribute('aria-checked')) === 'true',
  'new entries still go to Home',
);
await noOverflow('in the Places sheet');
await targets('in the Places sheet');
await docShot('stock-places-sheet');
await shot('stock-places-sheet');

// The entry place cannot stop counting; another place can.
await row('Home').locator('[role="checkbox"]').click();
await page.waitForFunction(() =>
  /New entries go to Home/.test(document.querySelector('[data-places-problem]')?.textContent ?? ''),
);
expect(true, 'unticking the entry place is refused in words');
await row('Parents').locator('[role="radio"]').click();
await page.waitForFunction(() => !document.querySelector('[data-places-problem]'));
expect(
  (await row('Parents').locator('[role="radio"]').getAttribute('aria-checked')) === 'true',
  'new entries go to Parents now',
);
await closeSheet();
await page.waitForFunction(() => document.activeElement?.getAttribute('data-focus') === 'places');
expect(true, 'focus returns to the Places button');
await waitLine('Home · Parents');

// ---- Rows name the places; a mark goes to the entry place ----
await goto('#/stock?q=bourbon');
await page.locator('[data-toggle="bourbon-whiskey"]').click();
await waitInStock(2);
expect(
  (await rowPlaces('bourbon-whiskey')) === 'Parents',
  'the mark went to the entry place, Parents',
);
await seed('Home', 'bourbon-whiskey');
await page.reload({ waitUntil: 'load' });
await goto('#/stock?q=bourbon');
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="bourbon-whiskey"] [data-places]')?.textContent ===
    'Home · Parents',
);
expect(true, 'a row present in both names both, joined with a dot');
await waitLine('Home · Parents');
await shot('stock-places-rows');
await docShot('stock-places-rows');

// Unmarking while another place still has it says so and keeps the check mark.
await page.locator('[data-toggle="bourbon-whiskey"]').click();
await toast().filter({ hasText: 'Still in stock at Home' }).waitFor();
expect((await rowChecked('bourbon-whiskey')) === 'true', 'the check mark stays: Home still has it');
expect((await rowPlaces('bourbon-whiskey')) === 'Home', 'the row now names Home only');
await toast().getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="bourbon-whiskey"] [data-places]')?.textContent ===
    'Home · Parents',
);
expect(true, 'Undo puts the entry place back');

// An ingredient only the other place has: the check box adds it to the entry place.
await goto('#/stock?q=lime juice');
await page.waitForFunction(
  () => document.querySelector('[data-row="lime-juice"] [data-places]')?.textContent === 'Home',
);
await targets('with the places line on a row');
await page.locator('[data-toggle="lime-juice"]').click();
await toast().filter({ hasText: 'Added at Parents' }).waitFor();
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="lime-juice"] [data-places]')?.textContent ===
    'Home · Parents',
);
expect(
  (await rowChecked('lime-juice')) === 'true',
  'the check mark does not change, the toast says where it went',
);
// The names line opens one block per counting place; this is how another place's record changes.
const namesButton = page.getByRole('button', { name: /^Places for Lime Juice$/i });
await namesButton.click();
await page.locator('[data-sheet="batches"]').waitFor();
const block = (name) =>
  page.locator('[data-place-block]').filter({ has: page.locator('h3', { hasText: name }) });
expect((await page.locator('[data-place-block]').count()) === 2, 'one block per counting place');
await targets('in the per-place sheet');
await docShot('stock-places-detail');
await shot('stock-places-detail');
await block('Home').locator('[data-place-state]').click();
await page.waitForFunction(() =>
  document.querySelector('[data-place-block] [data-place-state][aria-checked="false"]'),
);
await closeSheet2();
await page.waitForFunction(
  () => document.querySelector('[data-row="lime-juice"] [data-places]')?.textContent === 'Parents',
);
expect(true, 'unmarked at Home through its block: only the entry place remains');
await page.waitForFunction(
  () => document.activeElement?.getAttribute('data-focus') === 'places:lime-juice',
);
expect(true, 'focus returns to the names line');
// Back to Home only: mark Home, unmark Parents.
await page.getByRole('button', { name: /^Places for Lime Juice$/i }).click();
await page.locator('[data-sheet="batches"]').waitFor();
await block('Home').locator('[data-place-state]').click();
await page.waitForFunction(() =>
  document.querySelector('[data-place-block] [data-place-state][aria-checked="true"]'),
);
await block('Parents').locator('[data-place-state]').click();
await closeSheet2();
await page.waitForFunction(
  () => document.querySelector('[data-row="lime-juice"] [data-places]')?.textContent === 'Home',
);
expect(true, 'back to Home only');

// ---- Unticking a place changes what counts ----
await goto('#/stock');
expect((await inStock()) === 2, 'two ingredients in stock with both places');
const both = await page.locator('.stock-summary').innerText();
await openSheet();
await row('Home').locator('[role="checkbox"]').click();
await waitInStock(1);
expect(
  (await page.locator('.stock-summary').innerText()) !== both,
  'the summary and makeable line changed',
);
await waitLine('Parents');
expect(
  (await page.locator('[data-places]').count()) === 0,
  'one counting place again: no names on rows',
);
await row('Home').locator('[role="checkbox"]').click();
await waitInStock(2);
await waitLine('Home · Parents');

// ---- Rename ----
await row('Parents').getByRole('button', { name: 'Rename Parents' }).click();
const field = page.locator('input[name="place-name"]');
await field.waitFor();
await field.fill('');
await page.keyboard.press('Enter');
await page.waitForFunction(() =>
  /Enter a name/.test(document.querySelector('[data-places-problem]')?.textContent ?? ''),
);
expect(true, 'an empty name is refused');
await page.locator('input[name="place-name"]').fill('Pantry');
await page.keyboard.press('Enter');
await row('Pantry').waitFor();
await waitLine('Home · Pantry');
expect(true, 'a renamed place shows under its new name everywhere');

// ---- Remove with Undo, then without ----
await row('Pantry').getByRole('button', { name: 'Remove Pantry' }).click();
await toast().filter({ hasText: 'Removed Pantry and its 2 stock entries' }).waitFor();
await waitLine('Home');
expect(
  (await row('Home').locator('[role="radio"]').getAttribute('aria-checked')) === 'true',
  'entries fall back to Home',
);
expect(
  await row('Home').getByRole('button', { name: 'Remove Home' }).isDisabled(),
  'the last place cannot be removed',
);
await toast().getByRole('button', { name: 'Undo' }).click();
await row('Pantry').waitFor();
await waitLine('Home · Pantry');
expect(
  (await row('Pantry').locator('[role="radio"]').getAttribute('aria-checked')) === 'true',
  'Undo restores the place as the one for new entries',
);
await closeSheet();
await goto('#/stock?q=bourbon');
await page.waitForFunction(
  () =>
    document.querySelector('[data-row="bourbon-whiskey"] [data-places]')?.textContent ===
    'Home · Pantry',
);
expect(true, 'and its stock records');

await openSheet();
await row('Pantry').getByRole('button', { name: 'Remove Pantry' }).click();
await row('Pantry').waitFor({ state: 'detached' });
await closeSheet();
await waitLine('Home');
await goto('#/stock');
expect((await inStock()) === 2, 'the other place keeps its two ingredients');

// ---- A reload keeps everything ----
await page.reload({ waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await waitLine('Home');
expect((await inStock()) === 2, 'a reload keeps the stock');
await openSheet();
expect((await page.locator('li.place-row').count()) === 1, 'a reload keeps the removal');
await closeSheet();
await noOverflow('after the reload');

await browser.close();
await site.close();
