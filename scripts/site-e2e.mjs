// `npm run e2e:site`: serves ./dist on localhost and checks in Chromium that
// the apps stay apart under one address: each has its own service worker
// scope, cache, database and manifest, and none removes what another keeps.
// Chromium: PLAYWRIGHT_CHROMIUM_PATH when set, otherwise Playwright's own.
/* global caches, document, indexedDB, navigator -- in functions the page runs */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { apps } from './site.mjs';

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
  const home = await context.newPage();
  await home.goto(`${origin}/`);
  const links = await home.$$eval('.apps a', (list) => list.map((a) => a.getAttribute('href')));
  check(
    apps.every((app) => links.includes(`${app.name}/`)),
    `the root page links every app (${links.join(', ')})`,
  );
  check(
    (await home.evaluate(() => document.querySelector('link[rel=manifest]'))) === null,
    'the root page has no manifest, so it claims no scope above the apps',
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
  const wanted = apps.map((app) => app.db);
  check(new Set(wanted).size === wanted.length, `database names differ (${wanted.join(', ')})`);
  for (const app of apps) {
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
