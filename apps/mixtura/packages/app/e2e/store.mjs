// The local store in a real browser: settings survive a reload, a version 1
// database is migrated without losing own data (and the interim localStorage
// preferences move into it), an old database with stock upgrades to version 6
// (its stock stores go: stock is kept in a space of the shared database), and
// a blocked or too-new database leaves the app read-only with a banner.
//
//   node e2e/store.mjs [width height]
/* global document, indexedDB, window -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';
import { readSpaces, readStock } from './stock-db.mjs';

const [width = 1200, height = 800] = process.argv
  .slice(2)
  .filter((a) => /^\d+$/.test(a))
  .map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();

const newPage = async (init) => {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await throttle(page, process.argv.slice(2));
  page.on('pageerror', (error) => {
    throw error;
  });
  if (init) await page.addInitScript(init);
  return page;
};
const ready = (page) => page.locator('nav.nav').waitFor();
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme ?? null);
const goSettings = async (page) => {
  await page.goto(`${site.url}#/settings`);
  await page.getByRole('button', { name: 'Light', exact: true }).waitFor();
};
/** Reads a database without the app: version, and all records of the named stores. */
const dump = (page, stores) =>
  page.evaluate(
    (names) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('mixtura');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const out = { version: db.version, stores: [...db.objectStoreNames] };
          const tx = db.transaction(names);
          let left = names.length;
          for (const name of names) {
            const all = tx.objectStore(name).getAll();
            all.onsuccess = () => {
              out[name] = all.result;
              if (--left === 0) {
                db.close();
                resolve(out);
              }
            };
          }
        };
      }),
    stores,
  );

/** Mixtura's stores of before version 6; stock is a collection of a space now. */
const STOCK_STORES = ['places', 'stock', 'storages', 'bindings'];
/** Waits for the device setting `spaces`: it is written behind the first read of the stock. */
const spacesSetting = (page) =>
  page.waitForFunction(
    () =>
      new Promise((done) => {
        const open = indexedDB.open('mixtura');
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get('spaces');
          get.onsuccess = () => {
            open.result.close();
            done(get.result !== undefined);
          };
        };
        open.onerror = () => done(false);
      }),
  );

// 1. An empty database: the app starts, a setting survives a reload.
{
  const page = await newPage();
  await goSettings(page);
  await page.waitForFunction(
    () => document.querySelector('#persistence')?.textContent !== 'Checking',
  );
  expect(
    (await page.locator('#persistence').innerText()).startsWith('Not requested yet'),
    'persistence is not requested at first load',
  );
  expect(
    (await page.getByText('Your data cannot be saved here').count()) === 0,
    'no banner when the store opens',
  );
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.getByRole('button', { name: 'US', exact: true }).click();
  await page.waitForFunction(async () =>
    (await window.indexedDB.databases()).some((d) => d.name === 'mixtura'),
  );
  await page.waitForTimeout(300);
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: 'US', exact: true }).waitFor();
  expect((await theme(page)) === 'dark', 'the theme survives a reload');
  expect(
    (await page.getByRole('button', { name: 'US', exact: true }).getAttribute('aria-pressed')) ===
      'true',
    'the unit setting survives a reload',
  );
  const data = await dump(page, ['settings']);
  expect(data.version === 6, 'a new database is at the current version (6)');
  const byKey = Object.fromEntries(data.settings.map((r) => [r.key, r.value]));
  expect(byKey.theme === 'dark' && byKey.units === 'us', 'the settings are records of the store');
  expect(
    STOCK_STORES.every((name) => !data.stores.includes(name)),
    'a new database has no stores for stock, places or sync',
  );
  expect(
    (await page.locator('#persistence').count()) === 1,
    'Settings reports the persistence answer',
  );
  await page.screenshot({ path: join(OUT, `store-settings-${width}x${height}.png`) });
  // Stock is read on its screen: a device without a space gets one, on this device only.
  await page.goto(`${site.url}#/stock`);
  await page.waitForFunction(
    () => document.querySelector('[data-spaces-line]')?.textContent === 'Home',
  );
  const spaces = await readSpaces(page);
  expect(
    spaces.length === 1 &&
      spaces[0].name === 'Home' &&
      /^[0-9a-f]{32}$/.test(spaces[0].id) &&
      spaces[0].storage.type === 'device' &&
      spaces[0].storage.address === '',
    'the shared database has the space Home, on this device only',
  );
  expect((await readStock(page)).length === 0, 'and no stock');
  await spacesSetting(page);
  const setting = (await dump(page, ['settings'])).settings.find((r) => r.key === 'spaces')?.value;
  expect(
    setting.entry === spaces[0].id &&
      setting.ticked.join() === spaces[0].id &&
      setting.known.join() === spaces[0].id,
    'the space is the entry space, the only ticked one and known to this device',
  );
  await page.context().close();
}

// 2. A version 1 database and the interim preferences: migrated, nothing lost.
{
  const page = await newPage();
  await page.goto(`${site.url}icons/icon.svg`);
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        localStorage.setItem('mixtura.prefs', JSON.stringify({ theme: 'dark', units: 'imperial' }));
        const open = indexedDB.open('mixtura', 1);
        open.onupgradeneeded = () => {
          const db = open.result;
          const specs = db.createObjectStore('specs', { keyPath: 'id' });
          specs.createIndex('lineageId', 'lineageId');
          specs.createIndex('lineage-version', ['lineageId', 'version'], { unique: true });
          specs.createIndex('templateId', 'templateId');
          specs.createIndex('status', 'status');
          const ingredients = db.createObjectStore('ingredients', { keyPath: 'id' });
          ingredients.createIndex('parentId', 'parentId');
          ingredients.createIndex('level', 'level');
          const templates = db.createObjectStore('templates', { keyPath: 'id' });
          templates.createIndex('parentId', 'parentId');
          db.createObjectStore('affinities', { keyPath: 'id' });
          db.createObjectStore('stock', { keyPath: 'ingredientId' });
          db.createObjectStore('settings', { keyPath: 'key' });
          db.createObjectStore('meta', { keyPath: 'key' });
          const id = 'u-0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f';
          specs.put({
            id,
            lineageId: id,
            version: 1,
            name: 'Kept through the upgrade',
            lines: [{ ingredientId: 'sugar', amount: 1, unit: 'g' }],
            status: 'draft',
          });
          open.transaction.objectStore('stock').put({ ingredientId: 'lime-juice', present: true });
        };
        open.onsuccess = () => {
          open.result.close();
          resolve();
        };
        open.onerror = () => reject(open.error);
      }),
  );
  expect((await dump(page, ['specs'])).version === 1, 'the fixture database is version 1');
  await goSettings(page);
  expect((await theme(page)) === 'dark', 'the old theme preference is applied');
  await page.getByRole('button', { name: 'Imperial', exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-focus="units-imperial"]')?.getAttribute('aria-pressed') ===
      'true',
  );
  expect(true, 'the old unit preference is applied from the store');
  await page.waitForFunction(() => localStorage.getItem('mixtura.prefs') === null);
  expect(true, 'the interim localStorage key is removed after the migration');
  const data = await dump(page, ['specs', 'settings']);
  expect(data.version === 6, 'the database was upgraded to the current version (6)');
  expect(
    data.specs.length === 1 && data.specs[0].name === 'Kept through the upgrade',
    'the spec survived the upgrade',
  );
  expect(
    STOCK_STORES.every((name) => !data.stores.includes(name)),
    'the stock stores are gone: stock is kept in a space now',
  );
  const kept = Object.fromEntries(data.settings.map((r) => [r.key, r.value]));
  expect(
    kept.theme === 'dark' && kept.units === 'imperial' && !('places' in kept),
    'the preferences were imported and no places setting is left',
  );
  await page.reload();
  await ready(page);
  expect((await theme(page)) === 'dark', 'the migrated theme survives a reload');
  expect(
    (await dump(page, ['specs'])).specs.length === 1,
    'the spec is still there after the reload',
  );
  await page.context().close();
}

// 2b. A version 3 database with stock rows: it upgrades without an error, its stock stores are
// gone (stock starts empty in a space, decision of 2026-11-19), own data and settings stay.
{
  const rows = [
    { ingredientId: 'gin', present: true, openedOn: '2026-11-01' },
    { ingredientId: 'rum', present: true, moreBatches: ['2026-10-20', '2026-10-01'] },
    { ingredientId: 'lime-juice', present: false, note: 'buy more' },
  ];
  const page = await newPage();
  await page.goto(`${site.url}icons/icon.svg`);
  await page.evaluate(
    (fixture) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('mixtura', 3);
        open.onupgradeneeded = () => {
          const db = open.result;
          for (const name of ['specs', 'ingredients', 'templates', 'affinities'])
            db.createObjectStore(name, { keyPath: 'id' });
          db.createObjectStore('stock', { keyPath: 'ingredientId' });
          for (const name of ['settings', 'meta', 'drafts'])
            db.createObjectStore(name, { keyPath: 'key' });
          for (const row of fixture) open.transaction.objectStore('stock').put(row);
          open.transaction.objectStore('specs').put({
            id: 'u-0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f',
            lineageId: 'u-0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f',
            version: 1,
            name: 'Kept through the upgrade',
            lines: [{ ingredientId: 'sugar', amount: 1, unit: 'g' }],
            status: 'draft',
          });
          open.transaction.objectStore('settings').put({ key: 'theme', value: 'dark' });
        };
        open.onsuccess = () => {
          open.result.close();
          resolve();
        };
        open.onerror = () => reject(open.error);
      }),
    rows,
  );
  expect((await dump(page, ['stock'])).version === 3, 'the fixture database is version 3');
  await page.goto(`${site.url}#/stock`);
  await page.waitForFunction(
    () => document.querySelector('.stock-summary strong')?.textContent === '0 in stock',
  );
  expect(true, 'the Stock screen opens and starts empty: the old stock is not carried over');
  expect(
    (await page.locator('.banner').count()) === 0,
    'the upgrade shows no banner: the store is writable',
  );
  await page.waitForFunction(
    () => document.querySelector('[data-spaces-line]')?.textContent === 'Home',
  );
  const spaces = await readSpaces(page);
  expect(
    spaces.length === 1 &&
      spaces[0].name === 'Home' &&
      /^[0-9a-f]{32}$/.test(spaces[0].id) &&
      spaces[0].storage.type === 'device',
    'the shared database has one space, Home, on this device only',
  );
  expect((await readStock(page)).length === 0, 'the space holds no stock');
  await spacesSetting(page);
  const data = await dump(page, ['specs', 'settings']);
  expect(data.version === 6, 'the version 3 database was upgraded to 6');
  expect(
    STOCK_STORES.every((name) => !data.stores.includes(name)),
    'the stores places, stock, storages and bindings are gone',
  );
  expect(
    data.specs.length === 1 && data.specs[0].name === 'Kept through the upgrade',
    'the spec survived the upgrade',
  );
  const byKey = Object.fromEntries(data.settings.map((r) => [r.key, r.value]));
  const space = spaces[0].id;
  expect(
    byKey.spaces?.entry === space &&
      byKey.spaces.ticked.join() === space &&
      byKey.spaces.known.join() === space &&
      byKey.theme === 'dark' &&
      !('places' in byKey),
    'the spaces setting names the space and the other settings stay',
  );
  // The upgraded device keeps stock like a new one: a mark lands in the space and survives.
  await page.goto(`${site.url}#/stock?q=lime juice`);
  await page.locator('[data-toggle="lime-juice"]').click();
  await page.waitForFunction(
    () => document.querySelector('.stock-summary strong')?.textContent === '1 in stock',
  );
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector('.stock-summary strong')?.textContent === '1 in stock',
  );
  const marked = await readStock(page, space);
  expect(
    marked.length === 1 &&
      marked[0].ingredientId === 'lime-juice' &&
      marked[0].present === true &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(marked[0].updatedAt),
    'a mark after the upgrade is a record of the space and survives a reload',
  );
  await page.context().close();
}

// 3. No IndexedDB: read-only with a banner, the app still works.
{
  const page = await newPage(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });
  await page.goto(site.url);
  await ready(page);
  const banner = page.locator('.banner', { hasText: 'Your data cannot be saved here' });
  await banner.waitFor();
  expect(true, 'the banner says the data cannot be saved');
  expect(
    (await banner.innerText()).includes('You can browse the drinks, but changes are not kept.'),
    'the banner names what still works',
  );
  await banner.getByRole('button', { name: 'Try Again' }).waitFor();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  expect((await theme(page)) === 'dark', 'settings still apply for the session');
  await page.screenshot({ path: join(OUT, `store-unavailable-${width}x${height}.png`) });
  await page.context().close();
}

// 4. A database from a newer version: refused, left untouched.
{
  const page = await newPage();
  await page.goto(`${site.url}icons/icon.svg`);
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('mixtura', 9);
        open.onupgradeneeded = () => open.result.createObjectStore('future', { keyPath: 'id' });
        open.onsuccess = () => {
          open.result.close();
          resolve();
        };
        open.onerror = () => reject(open.error);
      }),
  );
  await page.goto(site.url);
  await ready(page);
  const banner = page.locator('.banner', { hasText: 'Your data cannot be saved here' });
  await banner.waitFor();
  expect(
    (await banner.innerText()).includes('saved by a newer version of the app'),
    'a newer database shows its own reason',
  );
  expect((await dump(page, ['future'])).version === 9, 'the newer database was not touched');
  await page.screenshot({ path: join(OUT, `store-newer-${width}x${height}.png`) });
  await page.context().close();
}

await browser.close();
await site.close();
