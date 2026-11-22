// Export and import in a real browser: create data, export, wipe the site
// data (a fresh browser context), import, compare; a broken file changes
// nothing; Undo; the backup reminder; no request leaves the origin. Stock is
// not in the file (it is kept with the space): an import leaves it alone, and
// an older file that has stock says that it is not imported.
//
//   node e2e/exchange.mjs [width height] [--docs]
/* global document, indexedDB -- in functions the page runs */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';
import { readStock, seedStock } from './stock-db.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = resolve('dist', 'walk');
const DOCS = resolve('..', '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });
const shot = (page, name) =>
  page.screenshot({ path: join(docs ? DOCS : OUT, `${name}-${width}x${height}.png`) });

const example = JSON.parse(
  readFileSync(resolve('..', 'engine', 'schemas', 'examples', 'valid', 'export-full.json'), 'utf8'),
);
const KINDS = ['ingredients', 'templates', 'specs', 'affinities'];
const keyOf = () => (r) => r.id;
/** A place of a format 2 file. */
const PLACE = 'u-9b8a7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';
const user = Object.fromEntries(KINDS.map((k) => [k, example[k]]));
const norm = (list, key) => [...list].sort((a, b) => (key(a) < key(b) ? -1 : 1));
const same = (a, b) =>
  KINDS.every((k) => JSON.stringify(norm(a[k], keyOf(k))) === JSON.stringify(norm(b[k], keyOf(k))));

const site = await serve();
const browser = await launch();
const external = [];
const newPage = async () => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: docs ? 2 : 1,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await throttle(page, args);
  page.on('pageerror', (error) => {
    throw error;
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(site.url) && !r.url().startsWith('data:')) external.push(r.url());
  });
  return page;
};
const openData = async (page) => {
  await page.goto(`${site.url}#/settings/data`);
  await page.getByRole('button', { name: 'Export Everything' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-focus="import"]')?.disabled);
};
/** Reads or writes the stores without the app. */
const dump = (page) =>
  page.evaluate(
    (names) =>
      new Promise((res, rej) => {
        const open = indexedDB.open('mixtura');
        open.onerror = () => rej(open.error);
        open.onsuccess = () => {
          const db = open.result;
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
    [...KINDS, 'settings', 'meta'],
  );
const put = (page, stores) =>
  page.evaluate(
    (data) =>
      new Promise((res, rej) => {
        const open = indexedDB.open('mixtura');
        open.onerror = () => rej(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(Object.keys(data), 'readwrite');
          for (const [name, list] of Object.entries(data)) {
            for (const r of list) tx.objectStore(name).put(r);
          }
          tx.oncomplete = () => {
            db.close();
            res();
          };
          tx.onerror = () => rej(tx.error);
        };
      }),
    stores,
  );

// 1. Create data, export it.
let exported;
{
  const page = await newPage();
  await openData(page);
  // The message appears once the store has counted the user's records.
  await page.locator('#nothing-to-export').waitFor();
  expect(
    (await page.locator('#nothing-to-export').count()) === 1 &&
      (await page.getByRole('button', { name: 'Export Everything' }).isDisabled()),
    'nothing to export: message shown, button disabled',
  );
  expect(
    (await page.locator('#last-export').innerText()) === 'Not exported yet.',
    'never exported',
  );
  await put(page, user);
  await page.reload();
  await page.getByRole('button', { name: 'Export Everything' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-focus="export"]')?.disabled);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Everything' }).click(),
  ]);
  expect(
    /^mixtura-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()),
    `file name ${download.suggestedFilename()}`,
  );
  const path = join(OUT, `export-${width}.json`);
  await download.saveAs(path);
  exported = JSON.parse(readFileSync(path, 'utf8'));
  expect(
    exported.app === 'mixtura' && exported.formatVersion === 3 && !!exported.exportedAt,
    'the file has app, format version and instant',
  );
  expect(same(exported, user), 'the file holds exactly the user data');
  expect(
    !('stock' in exported) && !('spaces' in exported) && !('places' in exported),
    'no stock and no spaces in the file',
  );
  expect(
    !JSON.stringify(exported).includes('"theme"') && !('settings' in exported),
    'no settings and no seed data in the file',
  );
  await page.getByTestId('toast').waitFor();
  expect(
    (await page.getByTestId('toast').innerText()).startsWith('Exported 2 ingredients'),
    'toast with the counts',
  );
  await page.waitForFunction(() =>
    document.querySelector('#last-export')?.textContent?.startsWith('Last export: '),
  );
  expect(
    (await page.locator('#changes-since').innerText()) === '0 changes since the last export.',
    'the counter restarts',
  );
  await shot(page, 'data-exported');
  await page.context().close();
}

// 2. Wipe (fresh site data), import, compare, undo.
const file = join(OUT, `export-${width}.json`);
{
  const page = await newPage();
  await openData(page);
  expect((await dump(page)).specs.length === 0, 'the database is empty after the wipe');
  await page.getByTestId('import-input').setInputFiles(file);
  const preview = page.getByTestId('import-preview');
  await preview.waitFor();
  expect(
    (await preview.innerText()).includes('2 ingredients') &&
      (await preview.innerText()).includes('2 specs'),
    'the summary names the counts',
  );
  expect((await dump(page)).specs.length === 0, 'nothing is written before the choice');
  await shot(page, 'data-import-preview');
  await page.getByRole('button', { name: 'Merge', exact: true }).click();
  await page.getByTestId('toast').waitFor();
  expect(
    (await page.getByTestId('toast').innerText()).startsWith('Imported 2 ingredients'),
    'toast: Imported with counts',
  );
  const after = await dump(page);
  expect(same(after, user), 'the imported data equals the original');
  await shot(page, 'data-imported');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText('Import undone').waitFor();
  const undone = await dump(page);
  expect(
    KINDS.every((k) => undone[k].length === 0),
    'Undo restores the empty state',
  );
  expect(
    undone.meta.every((r) => r.key !== 'importBackup'),
    'the import backup is gone after undo',
  );
  // Replace, then the backup row and its removal. Stock is not part of it.
  const space = await seedStock(page, ['lime-juice'], { make: true });
  await page.getByTestId('import-input').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace Everything' }).click();
  await page.getByText(/^Imported/).waitFor();
  const kept = await readStock(page, space);
  expect(
    kept.length === 1 && kept[0].ingredientId === 'lime-juice' && kept[0].present === true,
    'Replace Everything leaves the stock of the space alone',
  );
  await page.getByRole('button', { name: 'Delete Import Backup' }).waitFor();
  await page.getByRole('button', { name: 'Delete Import Backup' }).click();
  await page.getByRole('button', { name: 'Delete Import Backup' }).waitFor({ state: 'detached' });
  expect(
    (await dump(page)).meta.every((r) => r.key !== 'importBackup'),
    'Delete Import Backup removes the copy',
  );
  await page.context().close();
}

// 3. Broken files change nothing.
{
  const page = await newPage();
  await openData(page);
  await seedStock(page, ['lime-juice'], { make: true });
  const cases = [
    ['not json', '{nope', 'The file cannot be read'],
    ['other app', JSON.stringify({ app: 'culina' }), 'The file is not a Mixtura export.'],
    [
      'newer format',
      JSON.stringify({ ...example, formatVersion: 7 }),
      'The file is from a newer version',
    ],
    ['schema', JSON.stringify({ ...example, specs: [{ id: 'x' }] }), 'The file does not match'],
    ['proto key', `{"app":"mixtura","x":{"__proto__":{"y":1}}}`, 'The file cannot be read'],
  ];
  for (const [name, body, title] of cases) {
    const path = join(OUT, `broken-${width}.json`);
    writeFileSync(path, body);
    await page.getByTestId('import-input').setInputFiles(path);
    const error = page.getByTestId('import-error');
    await error.waitFor();
    expect((await error.innerText()).includes(title), `${name}: "${title}"`);
    expect(
      (await error.innerText()).includes('Nothing was imported.'),
      `${name}: nothing imported`,
    );
    const data = await dump(page);
    expect(
      (await readStock(page)).length === 1 && data.specs.length === 0,
      `${name}: the database is unchanged`,
    );
  }
  const newer = join(OUT, `broken-${width}.json`);
  writeFileSync(newer, JSON.stringify({ ...example, formatVersion: 7 }));
  await page.getByTestId('import-input').setInputFiles(newer);
  await page.getByText('It is format 7; this app reads up to 3.').waitFor();
  expect(true, 'the newer-format text names both versions');
  const big = join(OUT, `big-${width}.json`);
  writeFileSync(big, ' '.repeat(10 * 1024 * 1024 + 1));
  await page.getByTestId('import-input').setInputFiles(big);
  await page.getByText('The file is too large').waitFor();
  expect(true, 'a file above the size limit is refused');
  await shot(page, 'data-import-error');
  await page.context().close();
}

// 3b. A file of an older format with places and stock: converted, its stock is not imported
// and the preview says so.
for (const formatVersion of [2, 1]) {
  const page = await newPage();
  await openData(page);
  const space = await seedStock(page, ['lime-juice'], { make: true });
  const old = { ...example, formatVersion };
  old.stock =
    formatVersion === 1
      ? [{ ingredientId: 'gin', present: true }]
      : [{ placeId: PLACE, ingredientId: 'gin', updatedAt: '2026-11-17T09:10:00Z', present: true }];
  if (formatVersion === 2) {
    old.places = [{ id: PLACE, name: 'Cabin', updatedAt: '2026-11-17T09:00:00Z' }];
  }
  const path = join(OUT, `format-${formatVersion}-${width}.json`);
  writeFileSync(path, JSON.stringify(old));
  await page.getByTestId('import-input').setInputFiles(path);
  const preview = page.getByTestId('import-preview');
  await preview.waitFor();
  const text = await preview.innerText();
  expect(
    text.includes(`older version (format ${formatVersion})`) &&
      text.includes('Stock in it is not imported'),
    `format ${formatVersion}: the preview says that the file's stock is not imported`,
  );
  expect(
    !/stock entr|\bplaces?\b/i.test(text),
    `format ${formatVersion}: no stock among the counts`,
  );
  await page.getByRole('button', { name: 'Replace Everything' }).click();
  await page.getByText(/^Imported/).waitFor();
  expect(same(await dump(page), user), `format ${formatVersion}: the own data is imported`);
  const stock = await readStock(page);
  expect(
    stock.length === 1 && stock[0].spaceId === space && stock[0].ingredientId === 'lime-juice',
    `format ${formatVersion}: the stock of the space is as before, nothing of the file in it`,
  );
  await page.context().close();
}

// 4. The reminder: calm, only after changes and 30 days, dismissible, only in Settings.
{
  const page = await newPage();
  await openData(page);
  const set = (value) =>
    put(page, { settings: [{ key: 'backup', value }] }).then(() => page.reload());
  const old = new Date(Date.now() - 45 * 86_400_000).toISOString();
  await set({ changesSinceExport: 0, lastExportAt: old });
  await page.getByRole('button', { name: 'Export Everything' }).waitFor();
  expect((await page.getByTestId('backup-reminder').count()) === 0, 'no reminder without changes');
  await set({ changesSinceExport: 3, firstChangeAt: new Date().toISOString() });
  await page.getByRole('button', { name: 'Export Everything' }).waitFor();
  expect((await page.getByTestId('backup-reminder').count()) === 0, 'no reminder before 30 days');
  await set({ changesSinceExport: 12, lastExportAt: old });
  await page.getByTestId('backup-reminder').waitFor();
  expect(
    (await page.getByTestId('backup-reminder').innerText()).includes(
      'You have 12 changes since your last export.',
    ),
    'the reminder names the count',
  );
  await shot(page, 'data-reminder');
  await page.goto(`${site.url}#/drinks`);
  await page.locator('nav.nav').waitFor();
  expect((await page.getByTestId('backup-reminder').count()) === 0, 'never on the Drinks list');
  await page.goto(`${site.url}#/settings`);
  await page.getByTestId('backup-reminder').waitFor();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await page.getByTestId('backup-reminder').waitFor({ state: 'detached' });
  await page.reload();
  // The row is drawn before the store has answered; wait for the count itself, then look.
  await page.getByRole('link', { name: /^Data.*12 changes since the last export\./s }).waitFor();
  expect((await page.getByTestId('backup-reminder').count()) === 0, 'dismissed stays away');
  expect(true, 'the Data row shows the count');
  await shot(page, 'settings-data-row');
  await page.context().close();
}

expect(external.length === 0, `no request left the origin ${external}`);
await browser.close();
await site.close();
