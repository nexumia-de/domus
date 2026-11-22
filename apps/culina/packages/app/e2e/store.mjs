// The local store in a browser: records survive a reload and a service worker update, and
// the store makes no request that leaves the origin. A stock item of the version before
// 2026-11-20 (in Culina's own database) moves into the shared database `domus` at the next start. The page is
// opened with `?e2e-store`, which exposes the open store as a promise on
// `globalThis.__culinaStore` (src/store/e2e-hook.ts; inert without that query).
import { readFileSync, writeFileSync } from 'node:fs';
import { check, distDir, watch } from './harness.mjs';
import { controlled } from './smoke.mjs';
import { domusStock } from './stock-helpers.mjs';

const ONION = { id: 'u-aaaa', name: 'Onion', parentId: 'alliums' };
const STOCK = {
  id: 'u-bbbb',
  ref: { kind: 'ingredient', id: 'u-aaaa' },
  amount: { value: 400, unit: 'g' },
  state: 'raw',
};

const put = (page) =>
  page.evaluate(
    async ([onion, stock]) => {
      const opened = await globalThis.__culinaStore;
      if (!opened.ok) return `open: ${opened.error.code}`;
      const results = [
        await opened.store.put('ingredients', onion),
        await opened.store.put('stock', stock),
      ];
      return results.every((r) => r.ok) ? 'ok' : JSON.stringify(results);
    },
    [ONION, STOCK],
  );

const read = (page) =>
  page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    if (!opened.ok) return { error: opened.error.code };
    const ingredients = await opened.store.list('ingredients');
    const stock = await opened.store.list('stock');
    return { ingredients: ingredients.records, stock: stock.records };
  });

const sameAsPut = (found) =>
  JSON.stringify(found) === JSON.stringify({ ingredients: [ONION], stock: [STOCK] });
/** After the move: the ingredient stays, the old item is a record of the shared collection. */
const MOVED = { present: true, amount: { value: 400, unit: 'g' }, state: 'raw' };
const moved = async (page) => {
  const found = await read(page);
  const rows = await domusStock(page);
  const values = rows.flatMap((row) => row.records.filter((r) => !r.deleted));
  return (
    JSON.stringify(found) === JSON.stringify({ ingredients: [ONION], stock: [] }) &&
    values.length === 1 &&
    values[0].key === 'u-aaaa' &&
    JSON.stringify(values[0].value) === JSON.stringify(MOVED)
  );
};

export const store = async (browser, server) => {
  const context = await browser.newContext();
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const url = `${server.origin}/?e2e-store#/settings`;
  const swPath = `${distDir}sw.js`;
  const swOriginal = readFileSync(swPath, 'utf8');
  try {
    await page.goto(url);
    await controlled(page);
    check((await put(page)) === 'ok', 'store: records are put in the browser');
    check(sameAsPut(await read(page)), 'store: they are read back');

    await page.reload();
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForFunction(() => globalThis.__culinaStock.records().then((r) => 'u-aaaa' in r));
    check(
      await moved(page),
      'store: they survive a reload, and the old stock item moved into the shared database domus',
    );

    const line = await page.getByText(/^Storage: /).textContent();
    check(Boolean(line), `store: Settings shows one storage line (${line})`);

    // A service worker update: a changed cache version makes a new worker install, take over
    // and delete the old cache, as a new build does.
    const before = await page.evaluate(() => caches.keys());
    const oldVersion = before[0].replace('culina-', '');
    const newVersion = 'e2e0update000000';
    writeFileSync(swPath, swOriginal.replaceAll(oldVersion, newVersion));
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(
      (name) => caches.keys().then((keys) => keys.length === 1 && keys[0] === name),
      `culina-${newVersion}`,
      { timeout: 15000 },
    );
    check(true, 'store: the service worker updated (new cache, old cache deleted)');
    await page.reload();
    await page.getByRole('heading', { level: 1 }).waitFor();
    check(await moved(page), 'store: they survive a service worker update');
  } finally {
    writeFileSync(swPath, swOriginal);
  }
  check(problems.length === 0, `store: no console error, CSP violation or foreign request`);
  if (problems.length) console.log(problems.join('\n'));
  await context.close();
};
