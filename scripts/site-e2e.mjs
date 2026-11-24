// `npm run e2e:site`: serves ./dist on localhost and checks in Chromium that
// the apps stay apart under one address: each has its own service worker
// scope, cache, database and manifest, and none removes what another keeps;
// and that they meet in the one database they share, the spaces.
// Chromium: PLAYWRIGHT_CHROMIUM_PATH when set, otherwise Playwright's own.
/* global caches, document, indexedDB, navigator -- in functions the page runs */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { apps, home as rootApp } from './site.mjs';

const dist = resolve(import.meta.dirname, '..', 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// As Cloudflare serves static assets: a folder answers with its index.html,
// a folder without the slash redirects to it, anything else is 404.
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
  let file = join(dist, path);
  if (!file.startsWith(dist) || !existsSync(file)) return response.writeHead(404).end();
  if (statSync(file).isDirectory()) {
    if (!path.endsWith('/')) return response.writeHead(308, { location: `${path}/` }).end();
    file = join(file, 'index.html');
    if (!existsSync(file)) return response.writeHead(404).end();
  }
  response.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://localhost:${server.address().port}`;

let failures = 0;
const check = (ok, text) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
const problems = [];
context.on('page', (page) => {
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
context.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`));
context.on('request', (r) => {
  const url = new URL(r.url());
  if (url.protocol.startsWith('http') && url.origin !== origin) problems.push(`foreign: ${url}`);
});

/** Opens an app and waits until its own service worker controls the page. */
const open = async (app) => {
  const page = await context.newPage();
  await page.goto(`${origin}/${app.name}/`);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  return page;
};

try {
  // The root of the address is the Household app: it loads, lists both apps, and claims no scope.
  const home = await context.newPage();
  await home.goto(`${origin}/`);
  await home.waitForSelector('.apps a');
  const links = await home.$$eval('.apps a', (list) => list.map((a) => a.getAttribute('href')));
  check(
    apps.every((app) => links.includes(`${app.name}/`)),
    `the root app links every app (${links.join(', ')})`,
  );
  check(
    (await home.title()) === 'Household' &&
      (await home.locator('h1').innerText()) === 'Household' &&
      (await home.locator('#sync-title').count()) === 1,
    'the root app loads: title, heading and the Sync section',
  );
  check(
    (await home.evaluate(() => document.querySelector('link[rel=manifest]'))) === null,
    'the root app has no manifest link, so it claims no scope above the apps',
  );
  check(
    (await home.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) ===
      0,
    'the root app registers no service worker',
  );
  for (const path of ['manifest.webmanifest', 'sw.js']) {
    const answer = await context.request.get(`${origin}/${path}`);
    check(answer.status() === 404, `the root serves no /${path} (${answer.status()})`);
  }
  // The headers file the deploy uploads: every file of the root app is revalidated and has the
  // baseline, and nothing of it touches an app's folder.
  const headers = readFileSync(join(dist, '_headers'), 'utf8');
  const rootFiles = [
    '/',
    ...readdirSync(dist)
      .filter((f) => statSync(join(dist, f)).isFile() && f !== '_headers')
      .map((f) => `/${f}`),
  ];
  for (const path of rootFiles) {
    const rule = headers
      .split('\n\n')
      .find((block) => block.split('\n')[0] === path && block.includes('Cache-Control'));
    check(rule !== undefined, `_headers: ${path} is served with no-cache`);
  }
  check(
    headers.includes("/main.js\n  Content-Security-Policy: frame-ancestors 'none'"),
    '_headers: the root app files carry the baseline',
  );

  // Open every app, then every app again: the second round activates nothing
  // new, the first has each worker clean up next to the caches of the others.
  const pages = [];
  for (const app of apps) pages.push(await open(app));
  for (const [index, app] of apps.entries()) {
    const page = pages[index];
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    const controller = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
    check(
      controller === `${origin}/${app.name}/sw.js`,
      `${app.name}: controlled by its own service worker (${controller})`,
    );
    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel=manifest]');
      const data = await (await fetch(link.href)).json();
      const at = (value) => new URL(value, link.href).pathname;
      return { id: at(data.id), scope: at(data.scope), start: at(data.start_url) };
    });
    const folder = `/${app.name}/`;
    check(
      manifest.id === folder && manifest.scope === folder && manifest.start === folder,
      `${app.name}: manifest id, scope and start are ${folder} (${JSON.stringify(manifest)})`,
    );
  }

  const any = pages[0];
  const scopes = await any.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname),
  );
  const folders = apps.map((app) => `/${app.name}/`);
  check(
    scopes.length === folders.length && folders.every((folder) => scopes.includes(folder)),
    `one service worker scope per app and none above them (${scopes.join(', ')})`,
  );

  const names = await any.evaluate(() => caches.keys());
  for (const app of apps) {
    check(
      names.filter((name) => name.startsWith(app.cachePrefix)).length === 1,
      `${app.name}: its cache is there after all workers activated (${names.join(', ')})`,
    );
  }
  check(
    names.every((name) => apps.some((app) => name.startsWith(app.cachePrefix))),
    'every cache belongs to one app by its name',
  );

  const databases = await any.evaluate(async () =>
    (await indexedDB.databases()).map((db) => db.name),
  );
  // An app without `db` keeps everything in the shared database of the root app.
  const withDb = [...apps, rootApp].filter((app) => app.db !== undefined);
  const wanted = withDb.map((app) => app.db);
  check(new Set(wanted).size === wanted.length, `database names differ (${wanted.join(', ')})`);
  for (const app of withDb) {
    check(databases.includes(app.db), `${app.name}: its database exists (${databases.join(', ')})`);
  }

  // Offline: each app still loads from its own cache.
  await context.setOffline(true);
  for (const [index, app] of apps.entries()) {
    await pages[index].reload();
    const title = await pages[index].title();
    check(title.length > 0, `${app.name}: loads offline ("${title}")`);
  }
  await context.setOffline(false);

  // A worker cleans up when it activates. The round above activated the apps
  // in list order; a fresh profile in the opposite order makes the first app
  // of the list activate next to the caches of the others.
  const second = await browser.newContext();
  for (const app of [...apps].reverse()) {
    const page = await second.newPage();
    await page.goto(`${origin}/${app.name}/`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.waitForFunction(
      (prefix) => caches.keys().then((names) => names.some((name) => name.startsWith(prefix))),
      app.cachePrefix,
    );
  }
  const page = await second.newPage();
  await page.goto(`${origin}/${apps[0].name}/`);
  const kept = await page.evaluate(() => caches.keys());
  for (const app of apps) {
    check(
      kept.some((name) => name.startsWith(app.cachePrefix)),
      `${app.name}: its cache survives the other apps activating after it (${kept.join(', ')})`,
    );
  }
  await second.close();

  // The apps share the database of spaces: stock marked in Mixtura on a device that never set
  // up sync is in a space on this device only, and the Household app shows that space.
  const bar = await context.newPage();
  await bar.goto(`${origin}/mixtura/#/stock`);
  await bar.waitForFunction(
    () => document.querySelector('[data-spaces-line]')?.textContent === 'Home',
  );
  check(true, 'mixtura: the stock is kept in a space called Home');
  await bar.locator('[data-focus="spaces"]').click();
  const link = bar.locator('[data-focus="spaces-household"]');
  await link.waitFor();
  check(
    (await link.evaluate((a) => a.href)) === `${origin}/`,
    'mixtura: the Spaces sheet links to the Household app at the root',
  );
  const status = await bar.locator('[data-space-sync]').innerText();
  check(status === 'On this device only', `mixtura: the space is on this device only (${status})`);
  const household = await context.newPage();
  await household.goto(`${origin}/`);
  await household.waitForSelector('[data-testid="space-card"]');
  const card = await household.locator('[data-testid="space-card"]').innerText();
  check(
    /Home/.test(card) && /On this device only|Nur auf diesem Gerät/.test(card),
    `household: lists the space Mixtura made (${card.replace(/\s+/g, ' ')})`,
  );

  // Culina hands what a dish lacks to the shopping list, and Emptio shows it (Culina's roadmap
  // goal 11). Four eggs in Culina's stock (its test hook `?e2e-store`, as Culina's own browser
  // checks stock it); Frikandelle for 4 then lacks six ingredients. Not proved here: two spaces,
  // a storage, another device; Emptio's native app.
  const cook = await context.newPage();
  await cook.goto(`${origin}/culina/?e2e-store#/classic/frikandelle`);
  await cook.locator('.recipe-block').first().waitFor();
  const stocked = await cook.evaluate(async () => {
    const id = 'fdc-group-egg-whole';
    const catalogue = await (await fetch('catalogue.json')).json();
    const byId = new Map(catalogue.ingredients.map((e) => [e.id, e]));
    const chain = [];
    for (let at = byId.get(id); at !== undefined; at = byId.get(at.parentId)) chain.unshift(at);
    const opened = await globalThis.__culinaStore;
    for (const record of chain)
      if (!(await opened.store.put('ingredients', record)).ok) return false;
    await globalThis.__culinaStock.add([
      { ref: { kind: 'ingredient', id }, amount: { value: 4, unit: 'count' } },
    ]);
    return true;
  });
  check(stocked, 'culina: four eggs are in its stock');
  await cook.reload();
  await cook.locator('.handover-offer').waitFor();
  await cook.getByRole('button', { name: 'Put on the shopping list' }).click();
  const confirm = cook.locator('.handover-confirm');
  await confirm.waitFor();
  const asked = await confirm
    .locator('.handover-lines:not(.handover-free) .handover-line')
    .evaluateAll((rows) =>
      rows.map((row) => ({
        name: row.querySelector('.handover-name')?.textContent ?? '',
        amount: row.querySelector('.handover-amount')?.textContent ?? undefined,
      })),
    );
  await confirm.locator('.handover-put').click();
  await cook.locator('.handover-said').waitFor();
  check(
    (await cook.locator('.handover-said').innerText()).trim() ===
      `Put ${asked.length} on the shopping list.`,
    `culina: the hand-over puts ${asked.length} on the list (${asked.map((a) => a.name).join(', ')})`,
  );
  // The way to the list opens Emptio in a new tab; the recipe and its Undo stay.
  const [list] = await Promise.all([
    context.waitForEvent('page'),
    cook.getByRole('link', { name: 'Open the shopping list' }).click(),
  ]);
  await list.waitForURL(`${origin}/emptio/**`);
  await list.locator('.entry').first().waitFor();
  const shown = await list.locator('.entry:not(.entry-bought)').evaluateAll((rows) =>
    rows.map((row) => ({
      name: row.querySelector('.entry-name')?.firstChild?.textContent ?? '',
      amount: row.querySelector('.entry-amount')?.textContent ?? undefined,
    })),
  );
  const same = (a, b) => a.name === b.name && (a.amount ?? null) === (b.amount ?? null);
  check(
    asked.length > 0 &&
      shown.length === asked.length &&
      asked.every((a) => shown.some((s) => same(a, s))),
    `emptio: shows every entry Culina wrote, with its amount (${shown.map((s) => `${s.name} ${s.amount ?? ''}`.trim()).join('; ')})`,
  );
  const first = asked[0];
  await list.getByRole('link', { name: `Edit ${first.name}` }).click();
  await list.locator('.origins').waitFor();
  const why = await list.locator('.origins').innerText();
  check(
    why.includes("From Cook's Workbench: Pan-fried meat loaf (Frikandelle)."),
    `emptio: the entry says it came from the dish in Culina (${why})`,
  );
  await list.goBack();
  await list.locator('.entry').first().waitFor();
  const ticked = asked[1];
  await list.getByRole('checkbox', { name: `${ticked.name}: bought` }).check();
  await list.locator('.entry-bought').first().waitFor();
  // Back in Culina: Undo takes back what it wrote and leaves what was ticked in Emptio.
  await cook.bringToFront();
  await cook.getByRole('button', { name: 'Undo' }).click();
  await cook.waitForFunction(() =>
    document.querySelector('.handover-said')?.textContent?.startsWith('Taken off the list'),
  );
  const undone = (await cook.locator('.handover-said').innerText()).trim();
  check(
    undone.endsWith(`Left on the list, ticked or changed since: ${ticked.name}.`),
    `culina: Undo says what it took back and what it left (${undone})`,
  );
  // The salt is bought in Emptio: no longer something to buy, so the offer counts none of them.
  const offerAfter = await cook.locator('.handover-count').innerText();
  check(
    offerAfter === `The stock lacks ${asked.length} ingredients for this.`,
    `culina: after Undo the offer counts nothing as on the list, the bought salt included (${offerAfter})`,
  );
  await list.reload();
  await list.locator('.entry, .empty').first().waitFor();
  const after = await list.locator('.entry').evaluateAll((rows) =>
    rows.map((row) => ({
      name: row.querySelector('.entry-name')?.firstChild?.textContent ?? '',
      bought: row.classList.contains('entry-bought'),
    })),
  );
  check(
    after.length === 1 && after[0].name === ticked.name && after[0].bought,
    `emptio: after Undo only the entry ticked in Emptio is left, still ticked (${JSON.stringify(after)})`,
  );

  check(problems.length === 0, `no console errors, no foreign requests ${problems.join('; ')}`);
} finally {
  await browser.close();
  server.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nsite e2e passed');
