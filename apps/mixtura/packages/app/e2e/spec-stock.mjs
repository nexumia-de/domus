// The Makeable tag and the stock panel on the spec screen (#82): nothing in
// stock, a missing line with Mark in stock and Undo and the link to Buy Next,
// a substitute, and a makeable drink. Screenshots go to dist/walk/; with
// --docs also to docs/screenshots/ at scale 2 as spec-stock-*.png.
//
//   node e2e/spec-stock.mjs [width height] [--docs] [--throttle=N] [--slow-frames=MS]
/* global document, indexedDB, innerWidth -- in functions the page runs */
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

const shot = async (name) => {
  await page.evaluate(() =>
    document.querySelector('[data-stock-panel]')?.scrollIntoView({ block: 'center' }),
  );
  await Promise.all([
    page.screenshot({ path: join(OUT, `spec-stock-${name}-${width}x${height}.png`) }),
    docs
      ? page.screenshot({ path: join(DOCS, `spec-stock-${name}-${width}x${height}.png`) })
      : undefined,
  ]);
};
const open = async (address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
  await page.locator('.spec').waitFor();
};
const stockIds = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const g = r.result.transaction('stock').objectStore('stock').getAll();
          g.onsuccess = () => {
            r.result.close();
            res(
              g.result
                .filter((x) => x.present)
                .map((x) => x.ingredientId)
                .sort(),
            );
          };
        };
      }),
  );
const setStock = async (ids) => {
  await page.evaluate(
    (list) =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const tx = r.result.transaction('stock', 'readwrite');
          const s = tx.objectStore('stock');
          s.clear();
          for (const id of list) s.put({ ingredientId: id, present: true });
          tx.oncomplete = () => {
            r.result.close();
            res();
          };
        };
      }),
    ids,
  );
};
const tag = () => page.locator('[data-stock-tag]');
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(!wide, `no horizontal scrolling ${where}`);
};
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('.stock-panel a, .stock-panel button')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0) continue;
      if (box.height < 43.5 || box.width < 43.5)
        bad.push(`${el.textContent} ${box.width}x${box.height}`);
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};

await open('#/drinks/daiquiri');
expect((await tag().count()) === 0, 'no tag while nothing is in stock');
expect(
  (await page.locator('[data-stock-panel="none"]').innerText()).includes('Nothing is marked'),
  'the panel says nothing is marked and offers Stock',
);
await shot('none');

// Missing one line: the tag names it, the row offers Mark in stock and Buy Next.
await setStock(['light-rum', 'lime-juice']);
await open('#/drinks/daiquiri');
expect((await tag().innerText()) === 'Missing Simple Syrup', `tag ${await tag().innerText()}`);
const rows = await page
  .locator('[data-stock-row]')
  .evaluateAll((e) => e.map((x) => x.dataset.stockRow));
expect(rows.join() === 'have,have,missing', `rows ${rows}`);
const rowText = await page.locator('[data-stock-row="missing"]').innerText();
expect(rowText.includes('Missing: Simple Syrup'), `missing row says ${rowText}`);
const href = await page.getByRole('link', { name: /Buy Next/ }).getAttribute('href');
expect(href === '#/stock/buy-next?open=simple-syrup', `Buy Next link ${href}`);
await noOverflow('on the spec screen');
await targets('in the stock panel');
await shot('missing');

await page.locator('[data-action="mark-stock"]').click();
await tag().filter({ hasText: 'Makeable' }).waitFor();
expect((await tag().innerText()) === 'Makeable', 'marking the line makes the drink makeable');
await shot('marked');
await page.getByRole('button', { name: 'Undo' }).click();
await tag().filter({ hasText: 'Missing Simple Syrup' }).waitFor();
expect((await tag().innerText()) === 'Missing Simple Syrup', 'Undo takes the mark back');
await page.waitForFunction(() => document.querySelector('[data-action="mark-stock"]'));
await page.locator('[data-action="mark-stock"]').click();
await tag().filter({ hasText: 'Makeable' }).waitFor();
await page.reload();
await page.locator('[data-stock-tag="makeable"]').waitFor();
expect((await stockIds()).includes('simple-syrup'), 'the mark is kept after a reload');

// A listed substitute (sugar for simple syrup).
await setStock(['light-rum', 'lime-juice', 'sugar']);
await open('#/drinks/daiquiri');
expect((await tag().innerText()) === 'With substitute', `tag ${await tag().innerText()}`);
const sub = await page.locator('[data-stock-row="substitute"]').innerText();
expect(sub.includes('Substitute: Sugar for Simple Syrup'), `substitute row says ${sub}`);
await shot('substitute');

await browser.close();
await site.close();
console.log('spec-stock: done');
