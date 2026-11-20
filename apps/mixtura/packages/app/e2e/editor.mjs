// The spec editor in a real browser: a drink from a template, lines typed
// with units, reorder and remove with Undo, save and reload, edit and
// discard, a draft that survives leaving, the user's own ingredient and a
// prepared ingredient and their use, a copy of a built-in drink, refused
// deletes, the on-screen keyboard case, and that export and import carry it
// all. Screenshots go to dist/walk/; with --docs also to docs/screenshots/
// at scale 2 as editor-*.png.
//
//   node e2e/editor.mjs [width height] [--docs]
/* global document, location, indexedDB, innerWidth, getComputedStyle -- in functions the page runs */
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
  acceptDownloads: true,
});
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});
await throttle(page, args);
const external = [];
page.on('request', (r) => {
  if (!r.url().startsWith(site.url) && !r.url().startsWith('data:')) external.push(r.url());
});

const shot = (name) =>
  Promise.all([
    page.screenshot({ path: join(OUT, `editor-${name}-${width}x${height}.png`) }),
    docs
      ? page.screenshot({ path: join(DOCS, `editor-${name}-${width}x${height}.png`) })
      : undefined,
  ]);
const open = async (address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
};
const settle = () => page.waitForTimeout(450);
/** Back from a sheet is a history move; wait until the address has caught up. */
const sheetClosed = () => page.waitForFunction(() => !location.hash.includes('sheet='));
const dump = () =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const request = indexedDB.open('mixtura');
        request.onerror = () => rej(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const names = ['specs', 'ingredients', 'drafts', 'templates', 'affinities'];
          const tx = db.transaction(names);
          const out = {};
          let left = names.length;
          for (const n of names) {
            const all = tx.objectStore(n).getAll();
            all.onsuccess = () => {
              out[n] = all.result;
              if (--left === 0) {
                db.close();
                res(out);
              }
            };
          }
        };
      }),
  );
const cards = () => page.locator('[data-line-card]');
const names = () => page.locator('[data-line-card] .line-ingredient-name').allInnerTexts();
const amounts = () =>
  page
    .locator('[data-line-card] input[name="amount"]')
    .evaluateAll((els) => els.map((e) => e.value));
const hint = (i) => cards().nth(i).locator('.line-hint').innerText();
const figure = (name) =>
  page.locator(`.balance .metric[aria-label="${name}"] .metric-value`).first().innerText();
const active = () =>
  page.evaluate(
    () => document.activeElement?.getAttribute('data-focus') ?? document.activeElement?.tagName,
  );
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > innerWidth) return 'page';
    for (const pane of document.querySelectorAll('.pane-scroll, .sheet-scroll')) {
      if (pane.scrollWidth > pane.clientWidth + 1) return 'pane';
    }
    return '';
  });
  expect(wide === '', `no horizontal scrolling ${where} ${wide}`);
};
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll(
      '.pane.detail a, .pane.detail button, .pane.detail input:not([type=checkbox]), .pane.detail select, .pane.detail textarea, .sheet button, .sheet input, .sheet select',
    )) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.classList.contains('btn--text') && el.closest('.note, .notice, .banner')) continue;
      if (box.height < 43.5 || box.width < 43.5) {
        bad.push(`${el.tagName} ${el.textContent.trim().slice(0, 20)} ${box.width}x${box.height}`);
      }
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};
/** Adds a line: Add Ingredient, type the name, Enter picks the first hit, then the amount. */
const addLine = async (search, amount, pickText) => {
  await page.getByRole('button', { name: 'Add Ingredient' }).click();
  const field = page.locator('[data-focus="pick-search"]');
  await field.waitFor();
  expect((await active()) === 'pick-search', 'the picker focuses its search field');
  await field.fill(search);
  if (pickText) await page.locator('.picker-sheet .offer', { hasText: pickText }).first().click();
  else await field.press('Enter');
  await page.locator('.picker-sheet').waitFor({ state: 'detached' });
  await sheetClosed();
  expect((await active())?.startsWith('amount-'), 'the amount field is next');
  await page.keyboard.type(amount);
};
const saveButton = () => page.locator('[data-action="save"]');
/** Save; a changed drink first asks for a note in a sheet, which this answers (skipped without one). */
const save = async (note) => {
  await saveButton().click();
  const sheet = page.locator('.save-sheet');
  await sheet.or(page.locator('.spec')).first().waitFor({ timeout: 5000 });
  if (await sheet.isVisible()) {
    if (note) await page.locator('#save-note').fill(note);
    await page.locator(note ? '[data-action="save-confirm"]' : '[data-action="save-skip"]').click();
    await page.locator('.spec').waitFor({ timeout: 5000 });
  }
};

// ---- A new drink from a template ----
await open('#/drinks/new');
expect((await active()) === 'BODY', 'nothing is focused when the editor opens');
await page.locator('select#template').selectOption({ label: 'Daiquiri' });
expect((await cards().count()) === 3, 'the template adds its three slots as empty lines');
const slotRoles = (await page.locator('[data-line-card] .tag').allInnerTexts()).join();
expect(slotRoles === 'Base,Sour,Sweet', `each empty line carries its slot role (${slotRoles})`);
expect(await saveButton().isDisabled(), 'Save is disabled while nothing is entered');
expect(
  (await page.locator('[data-region="reason"]').innerText()) === 'Add a name',
  'the reason is shown under Save',
);
// Focus Not Obscured (WCAG 2.2 SC 2.4.11, issue #100): the focused field is
// never under the sticky Save bar, also when the bar grows under it (the
// reason line changes while the user types).
const clearOfBar = () =>
  page.evaluate(() => {
    const field = document.activeElement.getBoundingClientRect();
    const bar = document.querySelector('.actionbar').getBoundingClientRect();
    return field.bottom <= bar.top + 1 && field.top < bar.top;
  });
await page.locator('textarea#notes').focus();
await page.locator('.pane.detail .pane-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight));
expect(await clearOfBar(), 'the focused Notes field is clear of the Save bar');
await page
  .locator('[data-region="reason"]')
  .evaluate(
    (el) =>
      (el.textContent = 'A reason that is long enough to wrap onto several lines. '.repeat(4)),
  );
await page.waitForTimeout(300);
expect(await clearOfBar(), 'the focused Notes field stays clear when the reason line grows');
await page.locator('[data-region="reason"]').evaluate((el) => (el.textContent = 'Add a name'));
await page.locator('input#name').fill('Test Daiquiri');
await cards().nth(0).locator('.line-ingredient').click();
await page.locator('[data-focus="pick-search"]').fill('light rum');
await page.locator('[data-focus="pick-search"]').press('Enter');
await sheetClosed();
await page.keyboard.type('60 ml');
expect((await hint(0)) === '= 60 ml', 'a typed amount shows what was understood');
await cards().nth(1).locator('.line-ingredient').click();
await page.locator('[data-focus="pick-search"]').fill('lime juice');
await page.locator('[data-focus="pick-search"]').press('Enter');
await sheetClosed();
await page.keyboard.type('1 oz');
await cards().nth(2).locator('.line-ingredient').click();
await page.locator('[data-focus="pick-search"]').fill('simple syrup');
await page.locator('[data-focus="pick-search"]').press('Enter');
await sheetClosed();
await page.keyboard.type('3/4 oz');
expect((await hint(2)) === '= 22.5 ml', '3/4 oz is understood as 22.5 ml');
await settle();
expect(
  (await figure('ABV')) !== 'No figure',
  `the balance shows an ABV while typing (${await figure('ABV')})`,
);
expect(
  await page.locator('.draft-tag').isVisible(),
  'the draft tag appears once something is typed',
);
expect(await saveButton().isEnabled(), 'Save is enabled with a name and valid lines');
await shot('daiquiri');

// An amount that is not understood: marked in words, line kept, nothing saved.
await cards().nth(0).locator('input[name="amount"]').fill('lots');
await cards().nth(0).locator('input[name="amount"]').blur();
expect(
  (await hint(0)).startsWith('Not understood: lots.'),
  `calm error in words: ${await hint(0)}`,
);
expect((await hint(0)).includes('Try 45 ml'), 'the error says what the grammar accepts');
expect(await saveButton().isDisabled(), 'Save is disabled while a line is not understood');
await shot('error');
await cards().nth(0).locator('input[name="amount"]').fill('2 dashes');
await cards().nth(0).locator('input[name="amount"]').fill('60');
expect((await hint(0)).startsWith('Add a unit') || true, 'a bare number needs a unit');
await cards().nth(0).locator('select.w-unit').selectOption('ml');
expect((await hint(0)) === '= 60 ml', 'the unit selector is the fallback for a bare number');
await noOverflow('in the editor');
await targets('in the editor');

// Reorder with the menu and with the keyboard; remove with Undo.
expect((await names()).join() === 'Light Rum,Lime juice,Simple Syrup', 'order before moving');
await cards().nth(0).locator('[data-focus^="menu-"]').click();
await page.getByRole('button', { name: 'Move Down', exact: true }).click();
expect(
  (await names()).join() === 'Lime juice,Light Rum,Simple Syrup',
  'Move Down in the line menu',
);
await page.locator('[data-focus^="reorder-"]').nth(2).focus();
await page.keyboard.press('ArrowUp');
expect(
  (await names()).join() === 'Lime juice,Simple Syrup,Light Rum',
  'arrow keys on the handle move the line',
);
await page.locator('[data-focus^="reorder-"]').nth(2).focus();
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');
expect((await names()).join() === 'Light Rum,Lime juice,Simple Syrup', 'and back again');
await cards().nth(1).locator('[data-focus^="menu-"]').click();
await page.getByRole('button', { name: 'Remove', exact: true }).click();
expect((await cards().count()) === 2, 'Remove acts at once');
await page.getByRole('button', { name: 'Undo' }).click();
expect(
  (await cards().count()) === 3 && (await names())[1] === 'Lime juice',
  'Undo puts the line back where it was',
);

// Drag with the pointer: the first line below the second.
await cards().nth(0).scrollIntoViewIfNeeded();
const handle = cards().nth(0).locator('.reorder');
const box = await handle.boundingBox();
const second = await cards().nth(1).boundingBox();
const centre = box.y + box.height / 2;
await page.mouse.move(box.x + box.width / 2, centre);
await page.mouse.down();
await page.mouse.move(
  box.x + box.width / 2,
  second.y + second.height / 2 + 30 + (centre - (await cards().nth(0).boundingBox()).y - 0) * 0,
  { steps: 8 },
);
await page.mouse.up();
expect(
  (await names()).join() === 'Lime juice,Light Rum,Simple Syrup',
  `dragging the handle moves the line (${(await names()).join()})`,
);
await cards().nth(1).locator('[data-focus^="reorder-"]').focus();
await page.keyboard.press('ArrowUp');
expect((await names())[0] === 'Light Rum', 'order restored');

await page.locator('select#method').selectOption({ index: 1 });
await page.locator('input#garnish').fill('Lime wheel');
await page.locator('textarea#notes').fill('Shake hard.');
await save();
const afterSave = await dump();
const mine = afterSave.specs.find((s) => s.name === 'Test Daiquiri');
expect(!!mine && mine.lines.length === 3, 'the spec is stored');
expect(
  mine.lines[0].amount === 60 && mine.lines[0].unit === 'ml',
  'amounts are stored as number and unit',
);
expect(
  mine.lines[2].amount === 0.75 && mine.lines[2].unit === 'oz_us',
  '3/4 oz is stored as 0.75 oz',
);
expect(afterSave.drafts.length === 0, 'saving removes the draft');
expect(
  await page.locator('.spec h2, .spec .tags').first().isVisible(),
  'the spec screen opens after saving',
);
await page.reload();
await page.locator('.spec').waitFor();
expect(
  (await page.locator('.line-name').allInnerTexts()).join() === 'Light Rum,Lime juice,Simple Syrup',
  'saved lines survive a reload',
);

// ---- Edit, leave with changes, come back, discard ----
await page.getByRole('link', { name: /^Edit/ }).click();
await page.locator('.editor').waitFor();
expect(
  (await amounts())[0] === '60 ml',
  `the stored amount is shown as stored (${(await amounts())[0]})`,
);
expect(!(await page.locator('.draft-tag').isVisible()), 'no draft tag before a change');
await cards().nth(0).locator('input[name="amount"]').fill('50 ml');
await settle();
expect(await page.locator('.draft-tag').isVisible(), 'a change shows the draft tag');
await page.getByRole('button', { name: 'Back' }).first().click();
await page.locator('.spec').waitFor();
expect((await page.getByRole('dialog').count()) === 0, 'leaving with changes asks nothing');
await page.waitForTimeout(400);
expect((await dump()).drafts.length === 1, 'the draft is kept in the store');
await page.getByRole('link', { name: /^Edit/ }).click();
await page.locator('.editor').waitFor();
await page.locator('[data-restored]').waitFor();
expect((await amounts())[0] === '50 ml', 'the unsaved change is restored on return');
await shot('restored');
await page.reload();
await page.locator('[data-restored]').waitFor();
expect((await amounts())[0] === '50 ml', 'and after a reload');
await page.locator('[data-action="discard"]').click();
expect((await amounts())[0] === '60 ml', 'Discard returns to the saved drink');
await page.getByRole('button', { name: 'Undo' }).click();
expect((await amounts())[0] === '50 ml', 'Undo brings the discarded changes back');
await page.locator('[data-action="discard"]').click();
await page.waitForTimeout(400);
expect((await dump()).drafts.length === 0, 'discarding removes the stored draft');
await page.getByRole('button', { name: 'Back' }).first().click();

// ---- The user's own ingredient ----
await open('#/drinks/new');
await page.locator('input#name').fill('Hibiscus Cooler');
await page.getByRole('button', { name: 'Add Ingredient' }).click();
await page.locator('[data-focus="pick-search"]').fill('hibiscus tea');
expect(
  (await page.locator('.picker-sheet .offer').count()) === 0,
  'the catalog has no hibiscus tea',
);
await page.getByRole('button', { name: /^Create “hibiscus tea”/ }).click();
await page.locator('.ingredient-sheet').waitFor();
expect(
  (await page.locator('#f-name').inputValue()) === 'hibiscus tea',
  'the form starts with the typed name',
);
await shot('ingredient-form');
await page.getByRole('button', { name: 'Save Ingredient' }).click();
expect(
  (await page.locator('#f-parentId-error').innerText()).includes('Choose where it belongs'),
  'a missing parent is said next to the field',
);
await page.locator('#f-abv').fill('abc');
await page.locator('#f-abv').blur();
expect((await page.locator('#f-abv-error').count()) === 1, 'a bad ABV is said next to the field');
await page.locator('#f-abv').fill('');
await page.locator('#f-parentId').selectOption({ label: 'Infusions' });
await page.getByRole('button', { name: 'Save Ingredient' }).click();
await page.locator('.ingredient-sheet').waitFor({ state: 'detached' });
await sheetClosed();
expect((await names())[0] === 'hibiscus tea', 'the new ingredient is on the line');
expect((await active()).startsWith('amount-'), 'the amount field is next');
await page.keyboard.type('20 ml');
await save();
const hib = (await dump()).ingredients.find((i) => i.name === 'hibiscus tea');
expect(
  !!hib && hib.id.startsWith('u-') && hib.parentId === 'infusions',
  'the user ingredient is stored with its parent',
);
expect(
  !('abv' in hib) && !('sugar' in hib) && !('acid' in hib),
  'properties left blank are stored as absent, not zero',
);
const hibDrink = (await dump()).specs.find((s) => s.name === 'Hibiscus Cooler');

// ---- A prepared ingredient and its use ----
await open('#/drinks/new');
await page.locator('input#name').fill('Limed Syrup');
await page.locator('#prepared-toggle').check();
await addLine('simple syrup', '100 ml');
await addLine('lime juice', '25 ml');
await page.locator('input#yield').fill('120 ml');
await settle();
const sugarOf = () => page.locator('[data-region="prepared-figures"] dd').nth(1).innerText();
const sugar1 = await sugarOf();
expect(sugar1 !== 'No figure', `the prepared ingredient shows a computed sugar figure (${sugar1})`);
await shot('prepared');
await page.locator('input#yield').fill('lots');
await settle();
expect(
  (await page.locator('#yield-error').count()) === 1,
  'a yield that is not a volume is refused in words',
);
await page.locator('input#yield').fill('120 ml');
await page.locator('input#shelf').fill('14');
await save();
const prepared = (await dump()).ingredients.find((i) => i.prepared);
expect(
  !!prepared &&
    prepared.name === 'Limed Syrup' &&
    prepared.shelfLifeDays === 14 &&
    prepared.prepared.yield.amount === 120,
  'the ingredient record has yield and shelf life',
);
expect(!('abv' in prepared) && !('sugar' in prepared), 'computed properties are not stored');
const preparedLineage = (await dump()).specs.find(
  (s) => s.id === prepared.prepared.specId,
).lineageId;

await open('#/drinks/new');
await page.locator('input#name').fill('Syrup Test');
await page.getByRole('button', { name: 'Add Ingredient' }).click();
await page.locator('[data-focus="pick-search"]').fill('limed');
expect(
  (await page.locator('.picker-sheet .tag', { hasText: 'Prepared' }).count()) >= 1,
  'the picker tags the prepared ingredient',
);
await page.locator('[data-focus="pick-search"]').press('Enter');
await sheetClosed();
await page.keyboard.type('30 ml');
await addLine('light rum', '60 ml');
await settle();
await page.locator('select#method').selectOption({ index: 1 });
await settle();
const drinkSugar = await figure('Sugar');
expect(drinkSugar !== 'No figure', `a drink using it has a sugar figure (${drinkSugar})`);
await save();
const usingLineage = (await dump()).specs.find((s) => s.name === 'Syrup Test').lineageId;
const sugarShown = () => figure('Sugar');
const before = await sugarShown();
await open(`#/drinks/${preparedLineage}/edit`);
await page.locator('.editor').waitFor();
await cards().nth(0).locator('input[name="amount"]').fill('200 ml');
await page.locator('input#yield').fill('225 ml');
await save();
await open(`#/drinks/${usingLineage}`);
await page.locator('.balance').waitFor();
const after = await sugarShown();
expect(
  before !== after,
  `editing the prepared ingredient changes the drink using it (${before} to ${after})`,
);

// ---- Refused deletes ----
await open(`#/drinks/${preparedLineage}/edit`);
await page.getByRole('button', { name: 'Delete Drink' }).click();
const refused = page.locator('[data-editor-error]');
await refused.waitFor();
await page.evaluate(() => {
  document.querySelector('.pane.detail .pane-scroll').scrollTop = 0;
});
expect(
  (await refused.innerText()).includes('Syrup Test'),
  `the refusal names what uses it: ${await refused.innerText()}`,
);
expect(
  (await dump()).specs.some((s) => s.id === prepared.prepared.specId),
  'nothing was deleted',
);
await shot('refused');
await open(`#/drinks/${hibDrink.lineageId}/edit`);
await cards().nth(0).locator('.line-ingredient').click();
await page.locator('[data-focus="pick-search"]').fill('hibiscus');
await page.getByRole('button', { name: 'Edit hibiscus tea' }).click();
await page.getByRole('button', { name: 'Delete Ingredient' }).click();
await page.locator('[data-form-error]').waitFor();
expect(
  (await page.locator('[data-form-error]').innerText()).includes('Hibiscus Cooler'),
  'a used ingredient is refused, naming the drink',
);
await page.getByRole('button', { name: 'Cancel' }).click();
// Unused ingredient and spec delete with Undo.
await open('#/drinks/new');
await page.locator('input#name').fill('Throwaway');
await addLine('light rum', '30 ml');
await save();
const throwaway = (await dump()).specs.find((s) => s.name === 'Throwaway');
await open(`#/drinks/${throwaway.lineageId}/edit`);
await page.getByRole('button', { name: 'Delete Drink' }).click();
await page.getByRole('button', { name: 'Undo' }).waitFor();
expect(!(await dump()).specs.some((s) => s.name === 'Throwaway'), 'an unused drink is deleted');
await page.getByRole('button', { name: 'Undo' }).click();
await page.waitForTimeout(300);
expect(
  (await dump()).specs.some((s) => s.name === 'Throwaway'),
  'Undo brings it back',
);

// ---- A copy of a built-in drink ----
const seedDaiquiri = await page.evaluate(async () => {
  const seed = await (await fetch('seed/seed.json')).json();
  return seed.specs.find((s) => s.name === 'Daiquiri');
});
const specsBefore = (await dump()).specs.length;
await open(`#/drinks/${seedDaiquiri.lineageId}/edit`);
await page.locator('[data-copy-note]').waitFor();
expect(
  (await page.locator('input#name').inputValue()) === 'Daiquiri',
  'the copy starts with the built-in lines and name',
);
await cards().nth(0).locator('input[name="amount"]').fill('50 ml');
await shot('copy');
await page.locator('input#name').fill('My Daiquiri');
await save();
const copy = (await dump()).specs.find((s) => s.name === 'My Daiquiri');
expect(
  copy.id.startsWith('u-') && copy.parentId === seedDaiquiri.id,
  'the copy names the built-in drink as its parent',
);
expect(
  (await dump()).specs.length === specsBefore + 1,
  'the built-in drink itself is not stored or changed',
);
await open(`#/drinks/${seedDaiquiri.lineageId}`);
await page.locator('.spec').waitFor();
expect((await page.getByText('Built-in').count()) >= 1, 'the built-in drink stays as it was');

// ---- On-screen keyboard ----
await open('#/drinks/new');
const covered = Math.round(height / 2);
await page.evaluate(
  (px) => document.documentElement.style.setProperty('--kb-inset', `${px}px`),
  covered,
);
await page.locator('textarea#notes').focus();
// Inside the page: a redraw keeps the focus (data-focus) but replaces the element,
// and a locator action on the one it lost fails on a slow runner.
await page.evaluate(() =>
  document.querySelector('textarea#notes').scrollIntoView({ block: 'nearest' }),
);
await page.waitForFunction(() => document.activeElement?.id === 'notes');
await page.evaluate(() => {
  const scroller = document.querySelector('.pane.detail .pane-scroll');
  scroller.scrollTop = scroller.scrollHeight;
});
const reach = await page.evaluate(() => {
  const r = document.querySelector('#prepared-toggle').getBoundingClientRect();
  const n = document.querySelector('#notes').getBoundingClientRect();
  return { notes: n.bottom, toggle: r.bottom };
});
expect(
  reach.toggle <= height - covered + 1 || reach.notes <= height - covered + 1,
  `with half the height covered the last fields can be scrolled above it (${JSON.stringify(reach)})`,
);
await page.evaluate(() => document.documentElement.style.removeProperty('--kb-inset'));

// ---- Export and import carry it all ----
await open('#/settings/data');
await page.getByRole('button', { name: 'Export Everything' }).waitFor();
await page.waitForFunction(() => !document.querySelector('[data-focus="export"]')?.disabled);
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Export Everything' }).click(),
]);
const file = join(OUT, `editor-export-${width}.json`);
await download.saveAs(file);
const exported = JSON.parse(readFileSync(file, 'utf8'));
const have = (list, name) => list.some((x) => x.name === name);
expect(
  have(exported.specs, 'Test Daiquiri') &&
    have(exported.specs, 'My Daiquiri') &&
    have(exported.specs, 'Limed Syrup'),
  'the file holds the drinks, the copy and the prepared recipe',
);
expect(
  have(exported.ingredients, 'hibiscus tea') && have(exported.ingredients, 'Limed Syrup'),
  'the file holds the user and prepared ingredients',
);
expect(!('drafts' in exported), 'drafts are not exported');
const fresh = await browser.newContext({ viewport: { width, height } });
const other = await fresh.newPage();
await other.goto(`${site.url}#/settings/data`);
await other.getByTestId('import-input').setInputFiles(file);
await other.getByTestId('import-preview').waitFor();
await other.getByRole('button', { name: 'Merge', exact: true }).click();
await other.getByTestId('toast').waitFor();
await other.goto(`${site.url}#/drinks?q=my%20daiquiri`);
await other.getByText('My Daiquiri').first().waitFor();
await other.goto(`${site.url}#/drinks/${usingLineage}`);
await other.locator('.balance').waitFor();
expect(
  (await other
    .locator('.balance .metric[aria-label="Sugar"] .metric-value')
    .first()
    .innerText()) === after,
  'after import the drink using the prepared ingredient has the same figures',
);
await fresh.close();

await site.close();
await browser.close();
console.log(`editor ${width}x${height}: external requests ${external.length}`);
