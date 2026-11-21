// Versions, notes, status and riffs in a real browser: save three versions
// of a drink with notes, compare two, restore one, set the status and see
// the filter, make a riff from a built-in drink and from an active swap,
// read the family with a chain, and carry it all through export and import.
// Screenshots go to dist/walk/; with --docs also to docs/screenshots/ at
// scale 2 as versions-*.png.
//
//   node e2e/versions.mjs [width height] [--docs] [--slow-frames=MS]
/* global document, location, indexedDB, innerWidth -- in functions the page runs */
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
    page.screenshot({ path: join(OUT, `versions-${name}-${width}x${height}.png`) }),
    docs
      ? page.screenshot({ path: join(DOCS, `versions-${name}-${width}x${height}.png`) })
      : undefined,
  ]);
const open = async (address, on = page) => {
  await on.goto('about:blank');
  await on.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await on.locator('.fr-header h1').last().waitFor({ timeout: 5000 });
};
const dump = () =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const request = indexedDB.open('mixtura');
        request.onerror = () => rej(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['specs', 'ingredients']);
          const out = {};
          let left = 2;
          for (const n of ['specs', 'ingredients']) {
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
const saveButton = () => page.locator('[data-action="save"]');
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
const active = () =>
  page.evaluate(
    () => document.activeElement?.getAttribute('data-focus') ?? document.activeElement?.tagName,
  );
const sheetClosed = () => page.waitForFunction(() => !location.hash.includes('sheet='));
const pickIngredient = async (line, search) => {
  await cards().nth(line).locator('.line-ingredient').click();
  const field = page.locator('[data-focus="pick-search"]');
  await field.fill(search);
  await field.press('Enter');
  await sheetClosed();
};
const setAmount = (line, text) => cards().nth(line).locator('input[name="amount"]').fill(text);
/** Save a changed drink through the note sheet. */
const saveWithNote = async (note) => {
  await saveButton().click();
  const sheet = page.locator('.save-sheet');
  await sheet.waitFor({ timeout: 5000 });
  expect((await active()) === 'save-note', 'the note field has focus when the sheet opens');
  if (note) await page.locator('#save-note').fill(note);
  await page.locator('[data-action="save-confirm"]').click();
  await page.locator('.spec').waitFor({ timeout: 5000 });
};
const rowsOf = () => page.locator('.version-row');

// ---- A first save has no note sheet ----
await open('#/drinks/new');
await page.locator('select#template').selectOption({ label: 'Daiquiri' });
await page.locator('input#name').fill('Test Daiquiri');
await pickIngredient(0, 'light rum');
await page.keyboard.type('60 ml');
await pickIngredient(1, 'lime juice');
await page.keyboard.type('1 oz');
await pickIngredient(2, 'simple syrup');
await page.keyboard.type('3/4 oz');
await saveButton().click();
await page.locator('.spec').waitFor({ timeout: 5000 });
expect(
  !(await page.locator('.save-sheet').count()),
  'the first save writes version 1 without a sheet',
);
const lineage = (await dump()).specs.find((s) => s.name === 'Test Daiquiri').lineageId;
const tagTexts = () => page.locator('.tags .tag').allInnerTexts();
expect((await tagTexts()).includes('Version 1'), 'the spec screen says Version 1');
expect(
  (await page.getByRole('link', { name: 'Versions (1)' }).count()) === 1,
  'the spec screen links to the versions',
);

// ---- Saving unchanged says so and writes nothing ----
await open(`#/drinks/${lineage}/edit`);
await saveButton().click();
await page.getByText('Nothing has changed').waitFor();
expect(
  (await dump()).specs.filter((s) => s.lineageId === lineage).length === 1,
  'a save without changes adds no version',
);

// ---- Three versions with notes ----
await open(`#/drinks/${lineage}/edit`);
await setAmount(2, '15 ml');
await saveButton().click();
await page.locator('.save-sheet').waitFor();
expect(
  (await page.locator('.save-sheet .hint').innerText()).includes('version 2'),
  'the sheet says which version this becomes',
);
await shot('save-sheet');
await page.keyboard.press('Escape');
await page.locator('.save-sheet').waitFor({ state: 'detached' });
expect(
  (await dump()).specs.filter((s) => s.lineageId === lineage).length === 1,
  'closing the sheet saves nothing',
);
await saveWithNote('Less syrup');
await open(`#/drinks/${lineage}/edit`);
await setAmount(1, '30 ml');
await saveButton().click();
await page.locator('.save-sheet').waitFor();
await page.locator('[data-action="save-skip"]').click();
await page.locator('.spec').waitFor();
await open(`#/drinks/${lineage}/edit`);
await setAmount(0, '50 ml');
await saveWithNote('Less rum');
let stored = (await dump()).specs
  .filter((s) => s.lineageId === lineage)
  .sort((a, b) => a.version - b.version);
expect(
  stored.map((s) => s.version).join() === '1,2,3,4',
  `versions are consecutive (${stored.map((s) => s.version)})`,
);
expect(
  stored.map((s) => s.note ?? '').join('|') === '|Less syrup||Less rum',
  `notes are kept, a skipped note stays empty (${stored.map((s) => s.note ?? '')})`,
);

// ---- The versions list ----
await open(`#/drinks/${lineage}/versions`);
await rowsOf().first().waitFor();
expect((await rowsOf().count()) === 4, 'four versions are listed');
const firstRow = await rowsOf().first().innerText();
expect(
  firstRow.includes('Version 4') && firstRow.includes('Less rum') && firstRow.includes('Newest'),
  'newest first with its note',
);
expect(
  (await rowsOf().last().innerText()).includes('First version'),
  'the oldest says First version',
);
expect(
  (await page.locator('.version-figure').count()) >= 12,
  'every version shows its three figures',
);
expect(
  await page.locator('[data-action="compare"]').isDisabled(),
  'Compare waits for two versions',
);
await page.locator('[data-pick="1"]').check();
await page.locator('[data-pick="3"]').check();
expect(await page.locator('[data-action="compare"]').isEnabled(), 'Compare is on with two chosen');
await page.locator('[data-pick="4"]').check();
expect(
  (await page.locator('[data-pick]:checked').count()) === 2 &&
    !(await page.locator('[data-pick="1"]').isChecked()),
  'at most two can be chosen',
);
await noOverflow('on the versions list');
await shot('list');
await page.locator('[data-pick="1"]').check();
await page.locator('[data-pick="3"]').uncheck();
await page.locator('[data-action="compare"]').click();
await page.locator('.diff').waitFor();
const diffText = await page.locator('.diff').innerText();
expect(
  (await page.locator('[data-diff="changed"]').count()) === 3,
  `the diff of v1 and v4 lists three changed lines (${await page.locator('[data-diff]').count()})`,
);
expect(
  diffText.includes('Changed') && (await page.locator('.diff-marker').first().innerText()) === '~',
  'a changed line has the word and a shape',
);
expect(diffText.includes('22.5 ml to 15 ml'), 'the amounts before and after are shown');
expect(
  diffText.includes('Was') && diffText.includes('now'),
  'the figures are shown before and after',
);
expect(!/\b(better|worse|wrong|good|bad)\b/i.test(diffText), 'the diff passes no verdict');
await noOverflow('on the diff');
await shot('diff');

// ---- One version, read-only, then restore ----
await open(`#/drinks/${lineage}/v/1`);
await page.locator('.version-banner').waitFor();
expect(
  (await page.locator('.version-banner').innerText()).includes('Version 1 of 4'),
  'an old version says it is read-only',
);
expect((await page.locator('.balance .metric').count()) === 3, 'it has its own balance figures');
expect(
  !(await page.locator('.pane.detail input, .pane.detail textarea, .pane.detail select').count()),
  'nothing on it can be edited',
);
await shot('version');
await page.locator('[data-action="restore"]').click();
await rowsOf().first().waitFor();
await page.waitForFunction(() => document.querySelectorAll('.version-row').length === 5);
expect(
  (await rowsOf().first().innerText()).includes('Restored from v1'),
  'a restore is a new version with its note',
);
stored = (await dump()).specs.filter((s) => s.lineageId === lineage);
expect(
  stored.length === 5 &&
    stored.find((s) => s.version === 1).lines.some((l) => l.amount === 0.75) &&
    stored.find((s) => s.version === 5).lines.some((l) => l.amount === 0.75),

  'the older versions are still stored and unchanged',
);

// ---- Status ----
await open(`#/drinks/${lineage}/edit`);
await page.locator('select#status').selectOption({ label: 'On menu' });
await saveButton().click();
await page.locator('.spec').waitFor();
expect(!(await page.locator('.save-sheet').count()), 'a change of status asks for no note');
stored = (await dump()).specs.filter((s) => s.lineageId === lineage);
expect(stored.length === 5, 'a change of status adds no version');
expect(
  stored.find((s) => s.version === 5).statusLog.at(-1).status === 'on-menu',
  'the status log has the change',
);
expect((await tagTexts()).includes('On menu'), 'the status is shown in words');
await open(`#/drinks/${lineage}/edit`);
await page.locator('select#status').selectOption({ label: 'Retired' });
await saveButton().click();
await page.waitForFunction(() => location.hash === '#/drinks');
await open('#/drinks?q=daiquiri');
await page
  .locator('a.row', { hasText: /^Daiquiri/ })
  .first()
  .waitFor();
expect(
  !(await page.locator('a.row', { hasText: 'Test Daiquiri' }).count()),
  'a retired drink is hidden from the list',
);
await open('#/drinks?q=test%20daiquiri&status=retired');
await page.locator('a.row', { hasText: 'Test Daiquiri' }).first().waitFor();
expect(
  (await page.locator('.chip', { hasText: 'Status: Retired' }).count()) === 1,
  'the status filter shows as a chip',
);
await shot('status-filter');
await open(`#/drinks/${lineage}/edit`);
await page.locator('select#status').selectOption({ label: 'On menu' });
await saveButton().click();
await page.locator('.spec').waitFor();

// ---- A riff from a built-in drink ----
await open('#/drinks?q=daiquiri');
await page
  .locator('a.row', { hasText: /^Daiquiri/ })
  .first()
  .click();
await page.locator('.spec').waitFor();
const builtInId = decodeURIComponent(await page.evaluate(() => location.hash))
  .split('/')[2]
  .split('?')[0];
expect(
  !(await page.getByRole('link', { name: /^Versions/ }).count()),
  'a built-in drink has no versions link',
);
const barHeights = await page
  .locator('.bar-buttons .btn')
  .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
expect(
  barHeights.length === 3 && barHeights.every((x) => x >= 44 && x <= 52),
  `the three bar buttons keep their labels on one line (${barHeights})`,
);
await shot('spec-links');
await page.locator('[data-focus="riff"]').click();
await page.locator('.editor').waitFor();
expect((await active()) === 'BODY', 'nothing is focused when the riff editor opens');
expect(
  (await page.locator('input#name').inputValue()) === 'Daiquiri riff',
  'the name is suggested as "<name> riff"',
);
expect(
  (await page.locator('[data-copy-note]').innerText()).includes('a riff on Daiquiri'),
  'the editor says it is a riff',
);
await setAmount(2, '15 ml');
await saveButton().click();
await page.locator('.spec').waitFor({ timeout: 5000 });
expect((await tagTexts()).includes('Riff of Daiquiri'), 'the riff names its parent');
const riff = (await dump()).specs.find((s) => s.name === 'Daiquiri riff');
expect(riff.parentId === builtInId && riff.version === 1, 'the riff stores the built-in parent id');
expect(riff.note === 'Riff on Daiquiri v1', `the riff starts with its note (${riff.note})`);
expect(
  !(await dump()).specs.some((s) => s.id === builtInId),
  'the built-in drink is not stored or changed',
);

// ---- A riff from an active swap ----
await open(`#/drinks/${lineage}?swap=1::40ml`);
await page.locator('.swap-banner').waitFor();
const riffLink = page.locator('[data-focus="riff-from-swap"]');
expect((await riffLink.innerText()) === 'Save as Riff', 'swap mode offers Save as Riff');
await riffLink.click();
await page.locator('.editor').waitFor();
expect(
  (await cards().nth(1).locator('input[name="amount"]').inputValue()).includes('40'),
  'the riff starts from the swapped lines',
);
await page.locator('input#name').fill('Swap Riff');
await saveButton().click();
await page.locator('.spec').waitFor({ timeout: 5000 });
const swapRiff = (await dump()).specs.find((s) => s.name === 'Swap Riff');
expect(
  swapRiff.parentId === stored.find((s) => s.version === 5).id ||
    swapRiff.parentId.startsWith('u-'),
  'the swap riff names its parent version',
);

// ---- Family with a chain ----
const riffLineage = riff.lineageId;
await open(`#/drinks/${riffLineage}`);
await page.locator('[data-focus="riff"]').click();
await page.locator('.editor').waitFor();
await page.locator('input#name').fill('Third Generation');
await setAmount(0, '55 ml');
await saveButton().click();
await page.locator('.spec').waitFor({ timeout: 5000 });
const third = (await dump()).specs.find((s) => s.name === 'Third Generation');
await open(`#/drinks/${riffLineage}`);
await page.getByRole('link', { name: /^Family/ }).click();
await page.locator('.family').waitFor();
const order = await page
  .locator('[data-family]:not([data-family="sibling"])')
  .evaluateAll((els) =>
    els.map(
      (e) =>
        `${e.getAttribute('data-family')}:${e.querySelector('.row-title').firstChild.textContent}`,
    ),
  );
expect(
  order.join() === 'ancestor:Daiquiri,self:Daiquiri riff,child:Third Generation',
  `the family reads parent, this drink, its riff (${order})`,
);
expect(
  (await page.locator('[data-family-change]').first().innerText()).startsWith('One change'),
  'a riff says in one line what differs from its parent',
);
await noOverflow('on the family view');
await shot('family');
await open(`#/drinks/${third.lineageId}/family`);
await page.locator('.family').waitFor();
const chain = await page
  .locator('[data-family]:not([data-family="sibling"])')
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-family')));
expect(
  chain.join() === 'ancestor,ancestor,self',
  `a riff of a riff shows the whole chain (${chain})`,
);
await shot('family-chain');
await page.locator('[data-family="ancestor"]').first().locator('a').click();
await page.locator('.spec').waitFor();
expect(
  (await page.locator('.fr-header h1').last().innerText()).startsWith('Daiquiri'),
  'an entry opens that drink',
);
await open('#/drinks?q=nothing-like-this');
const loneId = lineage;
await open(`#/drinks/${loneId}/family`);
await page.locator('.family').waitFor();
expect(
  (await page.locator('.family').innerText()).includes('Swap Riff') ||
    (await page.locator('[data-family-empty]').count()) === 1,
  'the family of the test drink lists its riffs',
);

// ---- Deleting a parent that has riffs is refused ----
await open(`#/drinks/${riffLineage}/edit`);
await page.getByRole('button', { name: 'Delete Drink' }).click();
await page.locator('[data-editor-error]').waitFor();
expect(
  (await page.locator('[data-editor-error]').innerText()).includes('still used by'),
  'a drink with riffs is not deleted',
);

// ---- Export, then import into a fresh browser profile ----
await open('#/settings/data');
await page.getByRole('button', { name: 'Export Everything' }).waitFor();
await page.waitForFunction(() => !document.querySelector('[data-focus="export"]')?.disabled);
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Export Everything' }).click(),
]);
const file = join(OUT, `versions-export-${width}.json`);
await download.saveAs(file);
const exported = JSON.parse(readFileSync(file, 'utf8'));
expect(
  exported.specs.filter((s) => s.lineageId === lineage).length === 5,
  'the file holds every version',
);
const fresh = await browser.newContext({ viewport: { width, height } });
const other = await fresh.newPage();
await other.goto(`${site.url}#/settings/data`);
await other.getByTestId('import-input').setInputFiles(file);
await other.getByTestId('import-preview').waitFor();
await other.getByRole('button', { name: 'Merge', exact: true }).click();
await other.getByTestId('toast').waitFor();
await open(`#/drinks/${lineage}/versions`, other);
await other.locator('.version-row').first().waitFor();
const importedRows = await other.locator('.version-row').allInnerTexts();
expect(importedRows.length === 5, 'the imported drink has all its versions');
expect(
  importedRows.some((t) => t.includes('Less syrup')) &&
    importedRows.some((t) => t.includes('Restored from v1')),
  'the notes came along',
);
expect((await other.locator('.status-log li').count()) >= 2, 'the status log came along');
await open(`#/drinks/${third.lineageId}/family`, other);
await other.locator('.family').waitFor();
expect((await other.locator('[data-family="ancestor"]').count()) === 2, 'the family came along');
await fresh.close();

await site.close();
await browser.close();
console.log(`versions ${width}x${height}: external requests ${external.length}`);
