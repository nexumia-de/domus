// Stock and Buy Next in a real browser: mark stock by search and Enter and
// by tap, the Makeable filter and tags on the drinks list, Buy Next with its
// first suggestion (the count it shows is the rise of the makeable count),
// Undo, a reload and an offline reload keeping the stock, and the numbers
// (a toggle, the ranking) at the seed size. Screenshots go to dist/walk/;
// with --docs also to docs/screenshots/ at scale 2 as app-stock-*.png.
//
//   node e2e/stock.mjs [width height] [--docs]
/* global document, indexedDB, location, window, requestAnimationFrame -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';
import { readStock, seedStock } from './stock-db.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const phone = width < 840;
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
const external = [];
page.on('request', (request) => {
  if (!request.url().startsWith(site.url) && !request.url().startsWith('data:')) {
    external.push(request.url());
  }
});
if (phone) {
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
await throttle(page, args);

const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) });
const docShot = async (name) => {
  if (!docs) return;
  // The toast would hide rows; the next change brings it back.
  await page.evaluate(() => document.querySelector('.fr-toast')?.replaceChildren());
  await page.screenshot({ path: join(DOCS, `app-${name}-${width}x${height}.png`) });
};
const toast = () => page.getByTestId('toast');
const summary = () => page.locator('.stock-summary strong');
const inStock = async () => Number(/^(\d+)/.exec(await summary().innerText())?.[1] ?? NaN);
const listCount = async () =>
  Number(/^(?:\d+ of )?(\d+)/.exec(await page.locator('.list-count').innerText())?.[1]);
const filteredCount = async () =>
  Number(/^(\d+)/.exec(await page.locator('.list-count').innerText())?.[1]);

const noOverflow = async (where) => {
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > window.innerWidth) return 'page';
    for (const pane of document.querySelectorAll('.pane-scroll')) {
      if (pane.scrollWidth > pane.clientWidth + 1) return 'pane';
    }
    return '';
  });
  expect(wide === '', `no horizontal scrolling ${where} ${wide}`);
};
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('a, button, input, summary, [role="button"]')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || el.closest('[hidden]')) continue;
      const needed = el.classList.contains('row') ? 56 : 44;
      if (box.height < needed - 0.5 || box.width < 44 - 0.5) {
        bad.push(`${el.tagName} ${el.textContent.trim().slice(0, 20)} ${box.width}x${box.height}`);
      }
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};
/** Enter in the search field, then waits for the redraw that replaces the field. */
const enter = async () => {
  await page.evaluate(() => {
    window.__field = document.querySelector('input[name="q"]');
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !window.__field.isConnected);
  await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'q');
};
const tapMs = (action) =>
  page.evaluate(async (what) => {
    const t0 = performance.now();
    document.querySelector(what).click();
    await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
    return Math.round(performance.now() - t0);
  }, action);

// ---- Empty stock ----
await page.goto(`${site.url}#/stock`, { waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
expect((await inStock()) === 0, 'the summary says 0 in stock');
await page.getByText('Nothing in stock yet. Add what you have to see what you can make.').waitFor();
expect(
  (await page.locator('input[name="q"]').evaluate((el) => document.activeElement === el)) === false,
  'the search field is not focused on open',
);
await noOverflow('on the empty stock screen');
await targets('on the empty stock screen');
await docShot('stock-empty');
await shot('stock-empty');

// ---- Quick entry: search, Enter ----
const input = page.locator('input[name="q"]');
await input.click();
await page.keyboard.type('gin');
await page.waitForFunction(() => location.hash.includes('q=gin'));
const names = await page.locator('.stock-row .row-title').allInnerTexts();
expect(
  names.includes('Gin') && names.length < 40,
  `the search narrows the tree to ${names.length}`,
);
await enter();
await toast().filter({ hasText: 'Marked Gin in stock' }).waitFor();
expect(
  (await toast().innerText()).includes('need that product marked'),
  'marking a type says in one line what it means',
);
expect((await inStock()) === 1, 'Enter marked the first match');
expect((await input.inputValue()) === '', 'the field is cleared for the next entry');
await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'q');
expect(true, 'and keeps focus (quick entry)');
await page.keyboard.type('lime juice');
await page.waitForFunction(() => location.hash.includes('q=lime'));
await enter();
await page.waitForFunction(
  () => document.querySelector('.stock-summary strong')?.textContent === '2 in stock',
);
expect(true, 'a second Enter marks Lime juice');

// Undo the last change.
await toast().getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(
  () => document.querySelector('.stock-summary strong')?.textContent === '1 in stock',
);
expect(true, 'Undo takes the last mark back');
await input.click();
await page.keyboard.type('lime juice');
await page.waitForFunction(() => location.hash.includes('q=lime'));
await enter();
await page.waitForFunction(
  () => document.querySelector('.stock-summary strong')?.textContent === '2 in stock',
);

// ---- Tap, groups, counts, the show choice ----
await input.fill('');
await page.keyboard.press('Tab');
await page.locator('.stock-row--group').first().waitFor();
const spirits = page.getByRole('button', { name: 'Show Spirits contents' });
await spirits.click();
await page.getByRole('button', { name: 'Hide Spirits contents' }).waitFor();
const spiritsRow = page.locator('[data-row="spirits"]');
expect(
  /\d+ of \d+/.test(await spiritsRow.locator('.row-end').innerText()),
  'a group shows its count of marked products',
);
const vodka = page.getByRole('checkbox', { name: 'Vodka, in stock' });
await vodka.click();
await page.waitForFunction(
  () => document.querySelector('.stock-summary strong')?.textContent === '3 in stock',
);
expect((await vodka.getAttribute('aria-checked')) === 'true', 'a tap marks a row in stock');
// Arrow keys move between rows.
await vodka.focus();
await page.keyboard.press('ArrowDown');
expect(
  await page.evaluate(() => document.activeElement?.getAttribute('data-toggle') !== 'vodka'),
  'ArrowDown moves to the next row',
);
await page.getByRole('button', { name: 'In stock', exact: true }).click();
await page.waitForFunction(() => location.hash.includes('show=in'));
const onlyIn = await page.locator('.stock-row .row-title').allInnerTexts();
expect(
  onlyIn.includes('Vodka') && onlyIn.includes('Lime juice') && onlyIn.includes('Gin'),
  `"In stock" shows only what is there: ${onlyIn}`,
);
await docShot('stock-in-stock');
await shot('stock-in-stock');
await page.getByRole('button', { name: 'Clear Visible' }).click();
await page.waitForFunction(
  () => document.querySelector('.stock-summary strong')?.textContent === '0 in stock',
);
expect(true, 'Clear Visible marks everything visible out');
await toast().getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(
  () => document.querySelector('.stock-summary strong')?.textContent === '3 in stock',
);
expect(true, 'and Undo brings them back');
await page.getByRole('button', { name: 'In stock', exact: true }).click();
await page.waitForFunction(() => !location.hash.includes('show='));

// A small back bar by quick entry: one search and Enter per bottle.
await input.click();
let marked = 3;
for (const text of [
  'simple syrup',
  'campari',
  'sweet vermouth',
  'angostura aromatic',
  'club soda',
  'lemon juice',
]) {
  await page.keyboard.type(text, { delay: 15 });
  await page.waitForFunction((k) => location.hash.includes(`q=${k}`), text.replace(' ', '+'));
  await enter();
  marked += 1;
  await page.waitForFunction(
    (n) => document.querySelector('.stock-summary strong')?.textContent === `${n} in stock`,
    marked,
  );
}
expect(marked === 9, 'six more bottles marked by search and Enter');

// ---- The most used, then the drinks list ----
await page.goto(`${site.url}#/stock`);
expect((await inStock()) === 9, 'a navigation keeps the stock');
await page.locator('.stock-empty').waitFor({ state: 'detached' });
expect(true, 'the empty block is gone once something is marked');
await docShot('stock');
await shot('stock');
await noOverflow('on the stock screen');
await targets('on the stock screen');

await page.goto(`${site.url}#/drinks`);
await page.locator('.list-rows li').first().waitFor();
const tags = await page.locator('.list-rows .tag').count();
expect(tags > 0, `rows carry an availability tag once stock is marked (${tags} in the first rows)`);
await page.goto(`${site.url}#/drinks?makeable=yes`);
await page.locator('.list-count').waitFor();
const makeable0 = await filteredCount();
const total = await listCount();
expect(total === 639, 'the list counts 639 drinks');
console.log(`  makeable now with nine bottles: ${makeable0}`);
await page.locator('.chips button', { hasText: 'Makeable now' }).waitFor();
expect(true, 'the filter is a chip named in words');
await docShot('drinks-makeable');
await shot('drinks-makeable');
await noOverflow('on the makeable list');
await targets('on the makeable list');
await page.goto(`${site.url}#/drinks?makeable=one`);
await page.locator('.list-rows li').first().waitFor();
const oneTag = await page.locator('.list-rows .tag').first().innerText();
expect(/^Missing /.test(oneTag), `a missing-one row names what is missing: ${oneTag}`);
await docShot('drinks-missing-one');
await page.goto(`${site.url}#/drinks`);
await page.locator('.list-rows li').first().waitFor();
const several = await page.locator('.list-rows .tag', { hasText: /^Missing \d+$/ }).count();
expect(several > 0, `drinks missing several ingredients say how many (${several} rows)`);
await page.goto(`${site.url}#/drinks?makeable=one`);
await page.locator('.list-rows li').first().waitFor();
await shot('drinks-missing-one');

// The filters sheet counts and keeps the filter in the address.
await page.getByRole('button', { name: /^Filters/ }).click();
await page.getByRole('dialog', { name: 'Filters' }).waitFor();
await page.getByRole('button', { name: /^Makeable now \(\d+\)/ }).waitFor();
expect(true, 'the sheet has an Availability group with live counts');
await docShot('filters-availability');
await noOverflow('with the filters sheet');
await targets('in the filters sheet');
await page.getByRole('button', { name: /^Makeable now/ }).click();
await page.waitForFunction(() => location.hash.includes('makeable=yes'));
await page.getByRole('button', { name: /^Show \d+ Drinks?/ }).click();

// ---- Buy Next ----
await page.goto(`${site.url}#/stock/buy-next?strict=1`);
await page.locator('.buy-item').first().waitFor();
const first = page.locator('.buy-item').first();
const firstName = await first.locator('.row-title').innerText();
const unlocks = Number(/Unlocks (\d+)/.exec(await first.locator('.buy-unlocks').innerText())?.[1]);
console.log(`  first suggestion: ${firstName}, unlocks ${unlocks}`);
expect(unlocks > 0, 'the first suggestion unlocks drinks');
await noOverflow('on Buy Next');
{
  const text = await page
    .locator('.buy-item')
    .first()
    .evaluate((el) => el.parentElement.innerText);
  expect(!/Any brand/.test(text), 'Buy Next no longer says "Any brand does the same"');
  expect(/Type: any product of it works|Product/.test(text), 'the kind tag says what a type means');
}
await targets('on Buy Next');
await docShot('buy-next');
await shot('buy-next');
await first.locator('.buy-main').click();
await first.locator('.buy-drinks a').first().waitFor();
expect(
  (await first.locator('.buy-drinks a').count()) === unlocks,
  'the detail lists every drink the suggestion unlocks',
);
await docShot('buy-next-open');
await first.locator('.buy-drinks a').first().click();
await page.waitForFunction(() => location.hash.startsWith('#/drinks/'));
expect(true, 'a drink in the detail opens its spec');
await page.goBack();
await page.locator('.buy-item').first().waitFor();

await first.getByRole('button', { name: `Have it: ${firstName}` }).click();
await toast()
  .filter({ hasText: `Added ${firstName} to stock` })
  .waitFor();
await page.waitForFunction(
  (name) => document.querySelector('.buy-item .row-title')?.textContent !== name,
  firstName,
);
expect(true, 'the added ingredient leaves the list and the ranking is recomputed');
await page.goto(`${site.url}#/drinks?makeable=yes`);
await page.locator('.list-count').waitFor();
await page.waitForFunction(
  (before) =>
    Number(/^(\d+)/.exec(document.querySelector('.list-count')?.textContent ?? '')?.[1]) !== before,
  makeable0,
);
const makeable1 = await filteredCount();
expect(
  makeable1 - makeable0 === unlocks,
  `the makeable count rose by the ${unlocks} shown on Buy Next (${makeable0} to ${makeable1})`,
);

// With substitutes: the rise of "makeable now" plus "with a substitute" is the number shown.
const sumOfSheet = async () => {
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('dialog', { name: 'Filters' }).waitFor();
  const text = await page
    .locator('.sheet-group', { hasText: 'Availability' })
    .locator('.chip')
    .allInnerTexts();
  await page.getByRole('button', { name: 'Close filters' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  const n = (label) => Number(new RegExp(`${label} \\((\\d+)\\)`).exec(text.join('|'))?.[1]);
  return n('Makeable now') + n('With a substitute');
};
await page.goto(`${site.url}#/stock/buy-next`);
await page.locator('.buy-item').first().waitFor();
const loose = page.locator('.buy-item').first();
const looseName = await loose.locator('.row-title').innerText();
const looseUnlocks = Number(
  /Unlocks (\d+)/.exec(await loose.locator('.buy-unlocks').innerText())?.[1],
);
await page.goto(`${site.url}#/drinks`);
await page.locator('.list-rows li').first().waitFor();
const before = await sumOfSheet();
await page.goto(`${site.url}#/stock/buy-next`);
await page.locator('.buy-item').first().waitFor();
await page.getByRole('button', { name: `Have it: ${looseName}` }).click();
await toast().filter({ hasText: 'Added' }).waitFor();
await page.goto(`${site.url}#/drinks`);
await page.locator('.list-rows li').first().waitFor();
const after = await sumOfSheet();
expect(
  after - before === looseUnlocks,
  `with substitutes: makeable plus substitute rose by ${looseUnlocks} (${before} to ${after})`,
);

// ---- Remembered mode and the Buy Next settings ----
const openFresh = async (address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`);
};
const hash = () => page.evaluate(() => location.hash);
/** Waits until a setting is in the database: the write follows the tap. */
const settingStored = (key, value) =>
  page.waitForFunction(
    ([k, v]) =>
      new Promise((done) => {
        const open = indexedDB.open('mixtura');
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get(k);
          get.onsuccess = () => {
            open.result.close();
            done(get.result?.value === v);
          };
        };
        open.onerror = () => done(false);
      }),
    [key, value],
  );
const modeChecked = () => page.locator('.buy-mode').getAttribute('aria-checked');
await openFresh('#/stock/buy-next');
await page.locator('.buy-item').first().waitFor();
expect((await modeChecked()) === 'true', 'Buy Next starts with substitutes counted');
await page.locator('.buy-mode').click();
await page.waitForFunction(
  () => document.querySelector('.buy-mode')?.getAttribute('aria-checked') === 'false',
);
await settingStored('buyNextMode', 'strict');
expect(!(await hash()).includes('strict'), 'switching the mode leaves no mode in the address');
await openFresh('#/stock/buy-next');
await page.locator('.buy-item').first().waitFor();
expect((await modeChecked()) === 'false', 'the mode is remembered after a reload');
await openFresh('#/stock/buy-next?strict=0');
await page.locator('.buy-item').first().waitFor();
expect(
  (await modeChecked()) === 'true',
  'an address that names a mode wins over the remembered one',
);
await openFresh('#/stock/buy-next');
await page.locator('.buy-item').first().waitFor();
await page.locator('.buy-mode').click();
await page.waitForFunction(
  () => document.querySelector('.buy-mode')?.getAttribute('aria-checked') === 'true',
);
await settingStored('buyNextMode', 'with-substitutes');
await openFresh('#/settings');
const pressed = (name) => page.locator(`[data-focus="${name}"]`).getAttribute('aria-pressed');
expect(
  (await pressed('buy-next-drafts-yes')) === 'true' &&
    (await pressed('buy-next-retired-no')) === 'true',
  'Settings: drafts are ranked and retired drinks are not, by default',
);
await page.locator('[data-focus="buy-next-retired-yes"]').click();
await page.locator('[data-focus="buy-next-drafts-no"]').click();
await settingStored('buyNextRetired', 'yes');
await settingStored('buyNextDrafts', 'no');
await openFresh('#/settings');
// The settings arrive when the database has opened.
await page.waitForFunction(
  () => document.querySelector('[data-focus="buy-next-drafts-no"]')?.ariaPressed === 'true',
);
expect(
  (await pressed('buy-next-drafts-no')) === 'true' &&
    (await pressed('buy-next-retired-yes')) === 'true',
  'the Buy Next settings are remembered after a reload',
);
await page.locator('[data-focus="buy-next-retired-no"]').click();
await page.locator('[data-focus="buy-next-drafts-yes"]').click();
await settingStored('buyNextRetired', 'no');
await settingStored('buyNextDrafts', 'yes');
await openFresh('#/stock/buy-next');
await page.locator('.buy-item').first().waitFor();
expect(true, 'Buy Next ranks with the settings changed and changed back');
await noOverflow('on Settings');
await targets('on Settings');

// ---- Create an ingredient from the search (#83) ----
await openFresh('#/stock?q=Zzyzx%20Bitter');
await page.getByText('No ingredient matches.').waitFor();
await page.waitForFunction(() => document.querySelector('.stock-summary strong'));
const stockBefore = await inStock();
await page.getByRole('button', { name: 'Create \u201cZzyzx Bitter\u201d' }).click();
await page.locator('[data-sheet="ingredient"]').waitFor();
expect(
  (await page.locator('#f-name').inputValue()) === 'Zzyzx Bitter',
  'Create opens the form with the typed name',
);
await page.waitForFunction(() => document.activeElement?.hasAttribute('data-sheet'));
await noOverflow('in the create sheet');
await targets('in the create sheet');
await page.getByRole('button', { name: 'Save Ingredient' }).click();
await page.getByText('Choose where it belongs, for example Rum or Citrus.').waitFor();
expect(true, 'a form without a place says so next to the field');
await page.locator('#f-parentId').selectOption({ index: 1 });
await docShot('stock-create');
await shot('stock-create');
await page.getByRole('button', { name: 'Save Ingredient' }).click();
await page.getByText('Created Zzyzx Bitter and marked it in stock').waitFor();
await page.locator('[data-sheet]').waitFor({ state: 'detached' });
expect(!(await hash()).includes('sheet'), 'the sheet is gone from the address after saving');
await page.waitForFunction(
  (n) => document.querySelector('.stock-summary strong')?.textContent === `${n} in stock`,
  stockBefore + 1,
);
expect(true, 'the new ingredient is marked in stock');
await page.goto(`${site.url}#/stock?q=Zzyzx`);
await page.getByRole('checkbox', { name: 'Zzyzx Bitter, in stock' }).waitFor();
expect(true, 'the new ingredient is in the tree and in stock');
await page.reload({ waitUntil: 'load' });
await page.getByRole('checkbox', { name: 'Zzyzx Bitter, in stock' }).waitFor();
expect(true, 'a reload keeps the created ingredient');
await openFresh('#/stock?q=Zzyzx%20Bitter&sheet=ingredient');
await page.locator('[data-sheet="ingredient"]').waitFor();
await page.getByRole('button', { name: 'Cancel' }).click();
await page.locator('[data-sheet]').waitFor({ state: 'detached' });
await page.goto(`${site.url}#/stock?q=Qwx%20Syrup`);
await page.getByRole('button', { name: /^Create/ }).click();
await page.locator('#f-parentId').selectOption({ index: 1 });
await page.getByRole('button', { name: 'Save Ingredient' }).click();
await page.getByText('Created Qwx Syrup and marked it in stock').waitFor();
await page.getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(() => !document.querySelector('.fr-toast:not(:empty)'));
await page.goto(`${site.url}#/stock?q=Qwx`);
await page.getByText('No ingredient matches.').waitFor();
expect(true, 'Undo takes the created ingredient and its mark back');

// ---- Batches of a prepared ingredient (#101) ----
await page.clock.setFixedTime(new Date('2026-11-17T12:00:00'));
const SYRUP = 'u-7a0d6c1e-2b4f-4f0a-8e55-91a3c4d5e6f7';
const dumpStock = () => readStock(page);
await openFresh('#/stock');
await page.locator('.stock-tree').waitFor();
await page.evaluate(
  (id) =>
    new Promise((res) => {
      const r = indexedDB.open('mixtura');
      r.onsuccess = () => {
        const names = ['ingredients', 'specs'];
        const tx = r.result.transaction(names, 'readwrite');
        tx.objectStore('ingredients').put({
          id,
          name: 'Example rich syrup',
          level: 'product',
          parentId: 'syrups',
          role: 'sweet',
          shelfLifeDays: 14,
          prepared: {
            specId: 'u-0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f',
            yield: { amount: 300, unit: 'ml' },
          },
          source: { name: 'Entered by the user', licence: 'user' },
        });
        tx.objectStore('specs').put({
          id: 'u-0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f',
          lineageId: 'u-0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f',
          version: 1,
          name: 'Example rich syrup recipe',
          status: 'draft',
          lines: [
            { ingredientId: 'sugar', amount: 200, unit: 'g' },
            { ingredientId: 'water', amount: 100, unit: 'ml' },
          ],
        });
        tx.oncomplete = () => {
          r.result.close();
          res();
        };
      };
    }),
  SYRUP,
);
// Its stock goes into the space the app made.
await seedStock(page, [
  {
    ingredientId: SYRUP,
    updatedAt: '2026-11-17T12:00:00.000Z',
    present: true,
    openedOn: '2026-11-05',
    moreBatches: ['2026-11-14'],
  },
]);
await openFresh('#/stock');
const near = page.locator('[data-near-date]');
await near.waitFor();
expect(
  (await near.innerText()).includes('Use soon: 2 days left') &&
    (await near.innerText()).includes('and 1 more batch at hand'),
  'the list near their date names the batch that is use soon and counts the other',
);
await noOverflow('with the near-date list');
await targets('with the near-date list');
await docShot('stock-near-date');
await shot('stock-near-date');
await near.getByRole('button', { name: /Example rich syrup/ }).click();
const sheet = page.locator('[data-sheet="batches"]');
await sheet.waitFor();
await page.waitForFunction(() => document.activeElement?.getAttribute('data-sheet') === 'batches');
expect((await page.locator('.stock-batch').count()) === 2, 'the sheet lists both batches');
expect(
  (await sheet.innerText()).includes('Shelf life: 14 days'),
  'it says the shelf life the user entered',
);
await noOverflow('in the batches sheet');
await targets('in the batches sheet');
await docShot('stock-batches');
await shot('stock-batches');
// Add an older batch that is already past its date.
await page.locator('#batch-date').fill('2026-11-01');
await page.getByRole('button', { name: 'Add Batch' }).click();
await page.getByText('Added a batch of Example rich syrup made on 2026-11-01').waitFor();
await page.waitForFunction(() => document.querySelectorAll('.stock-batch').length === 3);
expect(
  (await page.locator('[data-batch="2026-11-01"]').innerText()).includes(
    'Past the date you set by 2 days',
  ),
  'the older batch says it is past, in words',
);
let record = (await dumpStock()).find((r) => r.ingredientId === SYRUP);
expect(
  record.openedOn === '2026-11-14' &&
    JSON.stringify(record.moreBatches) === '["2026-11-05","2026-11-01"]',
  `the newest batch is openedOn and the others are moreBatches ${JSON.stringify(record)}`,
);
await page.locator('#batch-date').fill('2026-11-01');
await page.getByRole('button', { name: 'Add Batch' }).click();
await page.getByText('A batch made on 2026-11-01 is already recorded.').waitFor();
await page.locator('#batch-date').fill('2026-12-01');
await page.getByRole('button', { name: 'Add Batch' }).click();
await page.getByText('A batch cannot be made in the future.').waitFor();
expect(true, 'a repeated or future day is refused in words next to the field');
// Used up acts at once, Undo brings it back.
await page.getByRole('button', { name: 'The batch made on 2026-11-01 is used up' }).click();
await page.waitForFunction(() => document.querySelectorAll('.stock-batch').length === 2);
await page.getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(() => document.querySelectorAll('.stock-batch').length === 3);
expect(true, 'Used up acts at once and Undo brings the batch back');
await page.keyboard.press('Escape');
await sheet.waitFor({ state: 'detached' });
await page.waitForFunction(() =>
  document.activeElement?.getAttribute('data-focus')?.startsWith('batches:'),
);
expect(true, 'Escape closes the sheet and the focus returns to its opener');
// The tree row of a prepared ingredient says how many batches and opens the sheet.
await openFresh('#/stock?q=rich%20syrup');
const row = page.locator(`[data-row="${SYRUP}"]`);
await row.waitFor();
expect((await row.innerText()).includes('3 batches'), 'the row says how many batches there are');
await row.getByRole('button', { name: 'Batches of Example rich syrup' }).click();
await sheet.waitFor();
expect((await page.locator('.stock-batch').count()) === 3, 'a reload keeps the three batches');
if (phone) {
  await page.goBack();
  await sheet.waitFor({ state: 'detached' });
  expect(true, 'Back closes the sheet on a phone');
}
// Used up, one after the other: the last one leaves the ingredient not at hand.
await openFresh(`#/stock?sheet=batches&ing=${SYRUP}`);
await sheet.waitFor();
for (let left = 3; left > 0; left--) {
  await page
    .getByRole('button', { name: /is used up$/ })
    .first()
    .click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('.stock-batch').length === n,
    left - 1,
  );
}
await page.getByText('No batch at hand.').waitFor();
record = (await dumpStock()).find((r) => r.ingredientId === SYRUP);
expect(
  record.present === false && record.openedOn === undefined && record.moreBatches === undefined,
  `with no batch left the record is out and holds no date ${JSON.stringify(record)}`,
);
await page.keyboard.press('Escape');
await page.locator('[data-near-date]').waitFor({ state: 'detached' });
expect(true, 'nothing is near its date any more');

// ---- Numbers ----
await page.goto(`${site.url}#/stock/buy-next`);
await page.locator('.buy-item').first().waitFor();
const rank = await page.evaluate(async () => {
  // Marks and unmarks an ingredient through the app: one ranking per tap.
  const t0 = performance.now();
  document.querySelector('.buy-mode').click();
  await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
  return Math.round(performance.now() - t0);
});
await page.goto(`${site.url}#/stock`);
await page.locator('.stock-tree').waitFor();
await page.getByRole('button', { name: 'Show Liqueurs contents' }).click();
await page.locator('[data-row="liqueurs"] + li, [data-parent="liqueurs"]').first().waitFor();
const rowsDrawn = await page.locator('.stock-row').count();
const tap = await tapMs('[data-parent="liqueurs"] .stock-toggle');
console.log(`NUMBERS ${width}x${height}${phone ? ' (4x CPU throttle)' : ''}`);
console.log(`  Buy Next: switching the mode, ranking recomputed and drawn: ${rank} ms`);
console.log(`  Stock: one tap on a row, with ${rowsDrawn} rows drawn: ${tap} ms`);
await page.waitForFunction(() => document.querySelector('.stock-summary'));
await docShot('stock-tree');

// ---- Reload and offline reload keep the stock ----
await page.goto(`${site.url}#/stock`);
marked = await inStock();
await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
await page.reload({ waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await page.waitForFunction(
  (n) => document.querySelector('.stock-summary strong')?.textContent === `${n} in stock`,
  marked,
);
expect(true, `a reload keeps the stock (${marked} in stock)`);
await context.setOffline(true);
await page.reload({ waitUntil: 'load' });
await page.locator('.stock-tree').waitFor();
await page.waitForFunction(
  (n) => document.querySelector('.stock-summary strong')?.textContent === `${n} in stock`,
  marked,
);
expect(true, 'a reload with the network off keeps the stock');
await context.setOffline(false);

// ---- The most used, in a fresh profile ----
{
  const fresh = await (await browser.newContext({ viewport: { width, height } })).newPage();
  await fresh.goto(`${site.url}#/stock`);
  await fresh.getByRole('button', { name: /^Mark the \d+ Most Used/ }).click();
  await fresh.waitForFunction(
    () => document.querySelector('.stock-summary strong')?.textContent === '12 in stock',
  );
  expect(true, 'the empty screen marks the twelve most used ingredients at once');
  await fresh.getByRole('button', { name: 'Undo' }).click();
  await fresh.waitForFunction(
    () => document.querySelector('.stock-summary strong')?.textContent === '0 in stock',
  );
  expect(true, 'and Undo takes them all back');
}

expect(external.length === 0, `no request left the origin ${external}`);
await browser.close();
await site.close();
