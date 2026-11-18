// Add Substitute in the editor's line menu, the in-stock mark in the picker and
// the storage text of a prepared ingredient (#89). A substitute is saved on the
// line, shown on the spec screen, and read by the stock panel as a substitute.
// Screenshots go to dist/walk/; with --docs also to docs/screenshots/ at scale 2
// as substitutes-*.png.
//
//   node e2e/substitutes.mjs [width height] [--docs] [--throttle=N] [--slow-frames=MS]
/* global document, location, indexedDB, innerWidth -- in functions the page runs */
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

const shot = (name) =>
  Promise.all([
    page.screenshot({ path: join(OUT, `substitutes-${name}-${width}x${height}.png`) }),
    docs
      ? page.screenshot({ path: join(DOCS, `substitutes-${name}-${width}x${height}.png`) })
      : undefined,
  ]);
const open = async (address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
};
const sheetClosed = () => page.waitForFunction(() => !location.hash.includes('sheet='));
const dump = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const names = ['specs', 'ingredients'];
          const tx = r.result.transaction(names);
          const out = {};
          let left = names.length;
          for (const n of names) {
            const g = tx.objectStore(n).getAll();
            g.onsuccess = () => {
              out[n] = g.result;
              if (--left === 0) {
                r.result.close();
                res(out);
              }
            };
          }
        };
      }),
  );
const setStock = (ids) =>
  page.evaluate(
    (list) =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          // Stock is kept per place (docs/store.md): the rows go into the default place.
          const tx = r.result.transaction(['stock', 'places'], 'readwrite');
          const s = tx.objectStore('stock');
          s.clear();
          const places = tx.objectStore('places').getAll();
          places.onsuccess = () => {
            for (const id of list) {
              s.put({
                placeId: places.result[0].id,
                ingredientId: id,
                updatedAt: '2026-11-18T10:00:00.000Z',
                present: true,
              });
            }
          };
          tx.oncomplete = () => {
            r.result.close();
            res();
          };
        };
      }),
    ids,
  );
const cards = () => page.locator('[data-line-card]');
const addLine = async (search, amount) => {
  await page.getByRole('button', { name: 'Add Ingredient' }).click();
  const field = page.locator('[data-focus="pick-search"]');
  await field.waitFor();
  await field.fill(search);
  await field.press('Enter');
  await page.locator('.picker-sheet').waitFor({ state: 'detached' });
  await sheetClosed();
  await page.waitForFunction(() =>
    document.activeElement?.getAttribute('data-focus')?.startsWith('amount-'),
  );
  await page.keyboard.type(amount);
};
const pressSave = async () => {
  await page.locator('[data-action="save"]').click();
  const skip = page.locator('[data-action="save-skip"]');
  const done = page.locator('.spec');
  await skip.or(done).first().waitFor({ timeout: 5000 });
  if (await skip.isVisible()) await skip.click();
  await page.locator('.spec').waitFor({ timeout: 5000 });
};
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(!wide, `no horizontal scrolling ${where}`);
};

// A drink of my own with two lines.
await open('#/drinks/new');
await page.locator('input#name').fill('Sub Test');
await addLine('light rum', '60 ml');
await addLine('lime juice', '22.5 ml');
await pressSave();
const lineage = (await dump()).specs.find((s) => s.name === 'Sub Test').lineageId;

// The picker marks what is in stock; Add Substitute is in the line menu.
await setStock(['bourbon-whiskey', 'lime-juice']);
await open(`#/drinks/${lineage}/edit`);
await page.locator('.editor').waitFor();
await cards().nth(0).locator('[data-focus^="menu-"]').click();
await page.getByRole('button', { name: 'Add Substitute', exact: true }).click();
const picker = page.locator('.picker-sheet');
await picker.waitFor();
expect(
  (await picker.locator('h2').innerText()) === 'Substitute for Light Rum',
  'the picker says what it is for',
);
await page.locator('[data-focus="pick-search"]').fill('bourbon');
const bourbon = picker.locator('[data-offer="bourbon-whiskey"]');
await bourbon.waitFor();
expect((await bourbon.locator('.offer-stock').count()) === 1, 'an ingredient in stock has a check');
expect((await picker.locator('.offer-stock').count()) === 1, 'only the ingredient in stock has it');
await shot('picker');
await bourbon.click();
await picker.waitFor({ state: 'detached' });
await sheetClosed();
const row = cards().nth(0).locator('[data-substitute="0"]');
expect(
  (await row.innerText()).includes('or '),
  `the substitute is listed (${await row.innerText()})`,
);
await row.locator('input').fill('2 dashes');
await noOverflow('with a substitute row');
const small = await page.evaluate(() =>
  [...document.querySelectorAll('.sub-row input, .sub-row button')]
    .map((el) => el.getBoundingClientRect())
    .filter((b) => b.height < 43.5 || b.width < 43.5)
    .map((b) => `${b.width}x${b.height}`),
);
expect(small.length === 0, `touch targets in the substitute row are at least 44 px ${small}`);
await shot('editor');
await pressSave();
const saved = (await dump()).specs
  .filter((s) => s.lineageId === lineage)
  .sort((a, b) => a.version - b.version)
  .at(-1);
expect(saved.version === 2, 'the change is a new version');
expect(
  JSON.stringify(saved.lines[0].substitutes) ===
    JSON.stringify([{ ingredientId: 'bourbon-whiskey', amount: 2, unit: 'dash' }]),
  `the substitute is stored with its amount (${JSON.stringify(saved.lines[0].substitutes)})`,
);
expect(
  (await page.locator('.line-note').allInnerTexts()).some((x) => x.includes('Bourbon')),
  'the spec screen shows it on the line',
);
await page.locator('[data-stock-tag="substitute"]').waitFor();
expect(
  (await page.locator('[data-stock-row="substitute"]').innerText()).includes('for Light Rum'),
  'the stock panel reads it as a substitute',
);

// Remove with Undo; the same substitute cannot be added twice.
await open(`#/drinks/${lineage}/edit`);
await page.locator('.editor').waitFor();
await page.locator('[data-action="remove-substitute"]').click();
expect((await page.locator('[data-substitute]').count()) === 0, 'Remove acts at once');
await page.getByRole('button', { name: 'Undo' }).click();
expect((await page.locator('[data-substitute]').count()) === 1, 'Undo puts it back');
await cards().nth(0).locator('[data-focus^="menu-"]').click();
await page.getByRole('button', { name: 'Add Substitute', exact: true }).click();
await page.locator('[data-focus="pick-search"]').fill('bourbon');
await picker.locator('[data-offer="bourbon-whiskey"]').click();
await picker.waitFor({ state: 'detached' });
expect((await page.locator('[data-substitute]').count()) === 1, 'no duplicate substitute');
expect(
  (await page.locator('.toast, [role="status"]').allInnerTexts()).join(' ').includes('already'),
  'it says so',
);

// A substitute amount that is not understood blocks Save, in words.
await page.locator('[data-substitute="0"] input').fill('lots');
await page.locator('[data-substitute="0"] input').blur();
await page.locator('.line-hint.is-error').first().waitFor();
expect(await page.locator('[data-action="save"]').isDisabled(), 'Save waits until it is fixed');
expect(
  (await page.locator('.line-hint.is-error').first().innerText()).includes('Bourbon'),
  'the error names the substitute',
);

// Storage text of a prepared ingredient.
await open('#/drinks/new');
await page.locator('input#name').fill('Keep Syrup');
await page.locator('#prepared-toggle').check();
await addLine('simple syrup', '100 ml');
await page.locator('input#yield').fill('100 ml');
await page.locator('input#shelf').fill('14');
await page.locator('input#storage').fill('In the fridge, closed');
await shot('storage');
await pressSave();
const ing = (await dump()).ingredients.find((i) => i.name === 'Keep Syrup');
expect(
  ing.storage === 'In the fridge, closed' && ing.shelfLifeDays === 14,
  'the ingredient record has shelf life and storage',
);
const syrupLineage = (await dump()).specs.find((s) => s.id === ing.prepared.specId).lineageId;
await open(`#/drinks/${syrupLineage}/edit`);
await page.locator('.editor').waitFor();
expect(
  (await page.locator('input#storage').inputValue()) === 'In the fridge, closed',
  'the storage text is shown again',
);
await page.locator('input#storage').fill('');
await pressSave().catch(() => undefined);

await browser.close();
await site.close();
console.log('substitutes: done');
