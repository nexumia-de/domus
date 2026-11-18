// Stock sync between two people in two browser contexts and two WebDAV servers,
// all through the UI (#137, docs/screens-sync.md#end-to-end-test). Needs both
// servers of tools/webdav-server (docs/sync-backends.md#test-server):
//
//   MIXTURA_WEBDAV_URL=http://127.0.0.1:8080 MIXTURA_WEBDAV_URL_2=http://127.0.0.1:8081 \
//   MIXTURA_WEBDAV_PASSWORD=... node e2e/sync.mjs [width height]
//
// MIXTURA_WEBDAV_USER defaults to `mixtura`. Without both addresses the script
// says so and ends successfully.
/* global document, window, location, history, indexedDB -- in functions the page runs */
import { resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const url1 = process.env.MIXTURA_WEBDAV_URL;
const url2 = process.env.MIXTURA_WEBDAV_URL_2;
if (!url1 || !url2) {
  console.log(
    'skipped: MIXTURA_WEBDAV_URL and MIXTURA_WEBDAV_URL_2 are not both set (start both servers of tools/webdav-server, see docs/sync-backends.md)',
  );
  process.exit(0);
}
const user = process.env.MIXTURA_WEBDAV_USER ?? 'mixtura';
const password = process.env.MIXTURA_WEBDAV_PASSWORD ?? '';
const [width = 360, height = 720] = process.argv
  .slice(2)
  .filter((a) => /^\d+$/.test(a))
  .map(Number);
const docs = process.argv.includes('--docs');
const DOCS = resolve('..', '..', 'docs', 'screenshots');
const stamp = Date.now().toString(36);
const folder1 = `flat-${stamp}`;
const folder2 = `parents-${stamp}`;

const site = await serve();
const browser = await launch();
const log = []; // every request of both people: { who, method, url }
const newPerson = async (who, start = '#/stock', ready = '.stock-tree') => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: docs ? 2 : 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror', (error) => {
    throw error;
  });
  context.on('request', (r) => log.push({ who, method: r.method(), url: r.url() }));
  await page.goto(`${site.url}${start}`, { waitUntil: 'load' });
  await page.locator(ready).waitFor();
  return { who, context, page };
};
const A = await newPerson('A');
const B = await newPerson('B');

const outside = (who) =>
  log.filter((r) => r.who === who && !r.url.startsWith(site.url) && !r.url.startsWith('data:'));
const external = () => outside('A').length + outside('B').length;
/** With --docs: the current screen as docs/screenshots/app-<name>-<width>x<height>.png (test data only). */
const docShot = async (p, name) => {
  if (!docs) return;
  await p.page.evaluate(() => document.querySelector('.toast')?.remove());
  await p.page.screenshot({ path: resolve(DOCS, `app-${name}-${width}x${height}.png`) });
};
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

// ---- Measuring (inside the page, in one step: a late redraw replaces elements) ----
const measure = (p, where) =>
  p.page
    .evaluate(() => {
      const out = { wide: document.documentElement.scrollWidth > window.innerWidth, small: [] };
      for (const pane of document.querySelectorAll('.pane-scroll')) {
        if (pane.scrollWidth > pane.clientWidth + 1) out.wide = true;
      }
      for (const el of document.querySelectorAll('a, button, input, select, summary')) {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || el.closest('[hidden], [inert]')) continue;
        const needed = el.classList.contains('row') ? 56 : 44;
        if (box.height < needed - 0.5 || box.width < 44 - 0.5) {
          out.small.push(
            `${el.tagName} ${(el.textContent || el.id).trim().slice(0, 20)} ${box.width}x${box.height}`,
          );
        }
      }
      return out;
    })
    .then((m) => {
      expect(!m.wide, `${p.who}: no horizontal scrolling ${where}`);
      expect(m.small.length === 0, `${p.who}: touch targets at least 44 px ${where} ${m.small}`);
    });

// ---- Navigation and the stock ----
const go = async (p, hash, ready) => {
  // Leaving an open sheet for the same screen would read as closing it and drop the new address.
  if ((await p.page.evaluate(() => location.hash)).includes('sheet=') && !hash.includes('sheet=')) {
    await p.page.evaluate(() => {
      location.hash = '#/settings';
    });
    await p.page.locator('nav.nav').waitFor();
    await pause(100);
  }
  await p.page.evaluate((h) => {
    location.hash = h;
  }, hash);
  try {
    await p.page.locator(ready).first().waitFor({ timeout: 15000 });
  } catch (e) {
    await p.page.screenshot({ path: `dist/walk/sync-fail-${p.who}.png` });
    console.log('hash', await p.page.evaluate(() => location.hash));
    throw e;
  }
};
const toSync = (p) => go(p, '#/settings/sync', '[data-sync-ready], .sync-page .card');
const toggle = async (p, id, name, wanted) => {
  await go(p, `#/stock?q=${encodeURIComponent(name)}`, `[data-toggle="${id}"]`);
  const button = p.page.locator(`[data-toggle="${id}"]`);
  if ((await button.getAttribute('aria-checked')) === String(wanted)) return;
  await button.click();
  await p.page.waitForFunction(
    ([i, w]) =>
      document.querySelector(`[data-toggle="${i}"]`)?.getAttribute('aria-checked') === String(w),
    [id, wanted],
  );
};
const INGREDIENTS = {
  gin: 'Gin',
  campari: 'Campari',
  'lime-juice': 'Lime juice',
  'dry-vermouth': 'Dry Vermouth',
  'light-rum': 'Light Rum',
  'simple-syrup': 'Simple Syrup',
  tequila: 'Tequila',
  vodka: 'Vodka',
  'sweet-vermouth': 'Sweet Vermouth',
};
const mark = (p, id) => toggle(p, id, INGREDIENTS[id], true);
const unmark = (p, id) => toggle(p, id, INGREDIENTS[id], false);
/** The ids of the ingredients in stock in the places that count, as the Stock screen lists them. */
const stockOf = async (p) => {
  await go(p, '#/stock?show=in', '.stock-tree, .empty, .stock-summary');
  await pause(300);
  return p.page.evaluate(() =>
    [...document.querySelectorAll('li[data-row]')]
      .filter(
        (li) => !li.querySelector('.stock-row--group') && li.querySelector('[aria-checked="true"]'),
      )
      .map((li) => li.getAttribute('data-row'))
      .sort(),
  );
};

// ---- Places sheet on Stock: add, entry place, counting ----
const openPlaces = async (p) => {
  await go(p, '#/stock?sheet=places', '[data-sheet="places"]');
};
const placeRow = (p, name) =>
  p.page
    .locator('li.place-row')
    .filter({ has: p.page.locator('[data-place-name]', { hasText: new RegExp(`^${name}$`) }) });
const addPlace = async (p, name) => {
  await openPlaces(p);
  await p.page.fill('#place-add', name);
  await p.page.locator('[data-focus="place-add-button"]').click();
  await placeRow(p, name).waitFor();
  await setEntry(p, name); // new entries go to the new place
};
const setEntry = async (p, name) => {
  await openPlaces(p);
  await placeRow(p, name).getByRole('radio').click();
  await p.page.waitForFunction((n) => {
    const rows = [...document.querySelectorAll('li.place-row')];
    return rows.some(
      (r) =>
        r.querySelector('[data-place-name]')?.textContent === n &&
        r.querySelector('[role="radio"]')?.getAttribute('aria-checked') === 'true',
    );
  }, name);
};
const untick = async (p, name) => {
  await openPlaces(p);
  const box = placeRow(p, name).getByRole('checkbox');
  if ((await box.getAttribute('aria-checked')) === 'true') await box.click();
  await p.page.waitForFunction((n) => {
    const rows = [...document.querySelectorAll('li.place-row')];
    return rows.some(
      (r) =>
        r.querySelector('[data-place-name]')?.textContent === n &&
        r.querySelector('[role="checkbox"]')?.getAttribute('aria-checked') === 'false',
    );
  }, name);
};

// ---- The Sync page ----
const sheet = (p) => p.page.locator('[data-sheet]');
const syncRow = (p, name) =>
  p.page
    .locator('li.sync-row--place')
    .filter({ has: p.page.locator('[data-place-name]', { hasText: new RegExp(`^${name}$`) }) });
const statusOf = (p, name) => syncRow(p, name).locator('[data-testid="place-status"]');
const waitStatus = (p, name, kind) =>
  p.page.waitForFunction(
    ([n, k]) => {
      for (const row of document.querySelectorAll('li.sync-row--place')) {
        if (row.querySelector('[data-place-name]')?.textContent !== n) continue;
        return row.querySelector('[data-testid="place-status"]')?.getAttribute('data-status') === k;
      }
      return false;
    },
    [name, kind],
  );
const closeSheet = async (p) => {
  await sheet(p).locator('[data-focus="back"]').click();
  await sheet(p).waitFor({ state: 'detached' });
};
const choose = async (p, selector, label) => {
  const value = await p.page
    .locator(`${selector} option`, { hasText: new RegExp(`^${label} ·`) })
    .getAttribute('value');
  await p.page.selectOption(selector, value);
};
const addStorage = async (p, label, address, { test = true, pass = password } = {}) => {
  await toSync(p);
  await p.page.locator('[data-focus="storage-add"]').click();
  await sheet(p).waitFor();
  expect(
    (await p.page.evaluate(() => document.activeElement?.matches('input, textarea, select'))) ===
      false,
    `${p.who}: nothing is focused on open that brings up the keyboard`,
  );
  await p.page.fill('#storage-label', label);
  await p.page.fill('#storage-address', address);
  await p.page.fill('#storage-user', user);
  await p.page.fill('#storage-password', pass);
  expect(
    (await p.page.locator('#storage-password').getAttribute('type')) === 'password',
    `${p.who}: the password is hidden`,
  );
  await p.page.locator('[data-focus="storage-password-show"]').click();
  expect(
    (await p.page.locator('#storage-password').getAttribute('type')) === 'text',
    `${p.who}: Show reveals the password`,
  );
  await p.page.locator('[data-focus="storage-password-show"]').click();
  if (test) {
    await p.page.locator('[data-focus="storage-test"]').click();
    await p.page.locator('[data-testid="test-result"]').waitFor();
    return p.page.locator('[data-testid="test-result"]').getAttribute('data-state');
  }
  return null;
};
const saveStorage = async (p) => {
  await p.page.locator('[data-focus="storage-save"]').click();
  await sheet(p).waitFor({ state: 'detached' });
};
const syncNow = async (p, name) => {
  await toSync(p);
  const before = await lastSync(p);
  await p.page.getByRole('button', { name: `Sync Now, ${name}` }).click();
  await p.page.waitForFunction(() => !document.querySelector('[data-status="syncing"]'));
  for (let i = 0; i < 100 && (await lastSync(p)) === before; i++) await pause(200);
  await waitStatus(p, name, 'synced');
};
/** The latest `lastSyncAt` of the bindings, read from the page's own database. */
const lastSync = (p) =>
  p.page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('mixtura');
        open.onsuccess = () => {
          const all = open.result.transaction('bindings').objectStore('bindings').getAll();
          all.onsuccess = () => {
            open.result.close();
            resolve(
              all.result
                .map((b) => b.lastSyncAt ?? '')
                .sort()
                .at(-1) ?? '',
            );
          };
        };
      }),
  );
const share = async (p, name) => {
  await toSync(p);
  await p.page.getByRole('button', { name: `Share ${name}` }).click();
  await sheet(p).waitFor();
  const read = (id) => p.page.locator(`#${id}`).inputValue();
  await p.page.locator('[data-testid="invite-qr"]').waitFor();
  const values = {
    invite: await read('share-invite'),
    address: await read('share-address'),
    folder: await read('share-folder'),
    code: await read('share-code'),
    passphrase: await read('share-passphrase'),
  };
  expect(
    (await sheet(p).locator('[data-testid="share-warning"]').innerText()).includes(
      'can read and change',
    ),
    `${p.who}: the Share sheet says who can read and change the stock`,
  );
  const qr = await p.page.locator('[data-testid="invite-qr"] svg').evaluate((svg) => {
    const box = svg.getBoundingClientRect();
    const fills = [...svg.querySelectorAll('[fill]')].map((n) => n.getAttribute('fill'));
    return {
      role: svg.getAttribute('role'),
      label: svg.getAttribute('aria-label'),
      width: box.width,
      fits: box.right <= window.innerWidth,
      fills,
    };
  });
  expect(
    qr.role === 'img' &&
      qr.label === 'QR code of the invite link' &&
      qr.width <= 240 &&
      qr.fits &&
      qr.fills.join() === '#fff,#000',
    `${p.who}: the QR code is a labelled image, dark on white, at most 240 px ${JSON.stringify(qr)}`,
  );
  const sheetText = await sheet(p).innerText();
  expect(
    sheetText.includes('contains the passphrase but not the storage’s user name or password') &&
      sheetText.includes('Or enter these values by hand'),
    `${p.who}: the Share sheet says what the link holds and offers the values by hand`,
  );
  await measure(p, 'on the Share sheet');
  if (name === 'Flat') await docShot(p, 'sync-share');
  await closeSheet(p);
  return values;
};
const bind = async (p, name, storage, folder) => {
  await toSync(p);
  await p.page.getByRole('button', { name: `Sync This Place, ${name}` }).click();
  await sheet(p).waitFor();
  await choose(p, '#bind-storage', storage);
  await p.page.fill('#bind-folder', folder);
  const passphrase = await p.page.locator('#bind-passphrase').inputValue();
  expect(
    /^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/.test(passphrase),
    `${p.who}: the sheet shows a generated passphrase`,
  );
  await measure(p, 'on the Sync This Place sheet');
  if (name === 'Flat' && p === A) await docShot(p, 'sync-bind');
  await p.page.locator('[data-focus="bind-start"]').click();
  await sheet(p).waitFor({ state: 'detached' });
  await waitStatus(p, name, 'synced');
};
const join = async (p, storage, values, passphrase = values.passphrase) => {
  await toSync(p);
  await p.page.locator('[data-focus="join-open"]').click();
  await sheet(p).waitFor();
  await choose(p, '#join-storage', storage);
  await p.page.fill('#join-folder', values.folder);
  await p.page.fill('#join-code', values.code);
  await p.page.fill('#join-passphrase', passphrase);
  await measure(p, 'on the Join a Place sheet');
  if (p === B) await docShot(p, 'sync-join');
  await p.page.locator('[data-focus="join-start"]').click();
};

// ================= 1. Nothing configured: no request leaves the origin =================
for (const p of [A, B]) {
  await mark(p, p === A ? 'vodka' : 'tequila'); // local data in the place Home
  await toSync(p);
  expect(
    (await statusOf(p, 'Home').getAttribute('data-status')) === 'local',
    `${p.who}: Home is "On this device only"`,
  );
  await measure(p, 'on the Sync page without storages');
  await openPlaces(p);
  await measure(p, 'on the Places sheet');
}
await pause(4000);
expect(
  outside('A').length === 0 && outside('B').length === 0,
  'before anything is configured no request leaves the origin',
);

// ================= 2. Storages, Flat, Join =================
// A third context (not logged) checks the answers Test Connection gives for a wrong password and a dead address.
{
  const C = await (async () => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    await page.goto(`${site.url}#/stock`, { waitUntil: 'load' });
    await page.locator('.stock-tree').waitFor();
    return { who: 'C', context, page };
  })();
  expect(
    (await addStorage(C, 'Wrong', url1, { pass: `${password}-wrong` })) === 'unauthorised',
    'Test Connection: wrong password is unauthorised',
  );
  expect(
    (await C.page.locator('[data-testid="test-result"]').innerText()).includes(
      'refused the user name or password',
    ),
    'and says so in words',
  );
  await C.page.fill('#storage-address', 'http://127.0.0.1:9');
  await C.page.locator('[data-focus="storage-test"]').click();
  await C.page.waitForFunction(
    () =>
      document.querySelector('[data-testid="test-result"]')?.getAttribute('data-state') ===
      'blocked',
  );
  const blocked = await C.page.locator('[data-testid="test-result"]').innerText();
  expect(
    blocked.includes('CORS') && blocked.includes('does not allow requests from this app'),
    'a blocked answer names the cause in plain words',
  );
  const href = await C.page.locator('[data-testid="test-result"] a').getAttribute('href');
  expect(href.endsWith('/docs/sync-backends.md'), 'and links to the setup document');
  await C.context.close();
}
for (const p of [A, B]) {
  expect(
    (await addStorage(p, 'S1', url1)) === 'reachable',
    `${p.who}: Test Connection reaches storage 1`,
  );
  await measure(p, 'on the Add Storage sheet with a result');
  if (p === A) await docShot(p, 'sync-storage');
  await saveStorage(p);
  expect(
    (await addStorage(p, 'S2', url2)) === 'reachable',
    `${p.who}: Test Connection reaches storage 2`,
  );
  await saveStorage(p);
  expect(
    (await p.page.locator('[data-storage]').count()) === 2,
    `${p.who}: both storages are listed`,
  );
  await measure(p, 'on the Sync page with storages');
}

await addPlace(A, 'Flat');
await untick(A, 'Home');
await mark(A, 'gin');
await bind(A, 'Flat', 'S1', folder1);
const flat = await share(A, 'Flat');
expect(
  flat.address === url1 &&
    flat.folder === folder1 &&
    /^u-/.test(flat.code) &&
    flat.passphrase.length >= 20,
  'A: the Share sheet shows address, folder, place code and passphrase',
);

await join(B, 'S1', flat);
await B.page.locator('[data-testid="toast"]').filter({ hasText: 'Joined the place' }).waitFor();
await waitStatus(B, 'Flat', 'synced');
expect((await syncRow(B, 'Flat').count()) === 1, 'B: the joined place has the name from the file');
await setEntry(B, 'Flat');
await untick(B, 'Home');
expect((await stockOf(B)).join() === 'gin', 'B: the joined place brought the stock');

// ================= 3. Both offline, changes, both back online =================
await A.context.setOffline(true);
await B.context.setOffline(true);
await mark(A, 'campari');
await mark(A, 'lime-juice');
await mark(A, 'simple-syrup'); // A's change of the shared ingredient comes first
await pause(150);
await mark(B, 'dry-vermouth');
await mark(B, 'light-rum');
await mark(B, 'simple-syrup'); // B changes it later, twice: it ends not in stock
await unmark(B, 'simple-syrup');
await unmark(B, 'gin'); // B removes what A had marked before
await toSync(A);
await toSync(B);
await pause(3500);
expect(
  (await statusOf(A, 'Flat').getAttribute('data-status')) === 'waiting',
  'A: offline with changes says "Waiting for connection"',
);
expect(
  (await statusOf(B, 'Flat').getAttribute('data-status')) === 'waiting',
  'B: offline with changes says "Waiting for connection"',
);
await A.context.setOffline(false);
await B.context.setOffline(false);
const expected = ['campari', 'dry-vermouth', 'light-rum', 'lime-juice'].join();
let seenA = '';
let seenB = '';
for (let round = 0; round < 4; round++) {
  await syncNow(A, 'Flat');
  await syncNow(B, 'Flat');
  seenA = (await stockOf(A)).join();
  seenB = (await stockOf(B)).join();
  if (seenA === seenB && seenA === expected) break;
}
expect(seenA === seenB, `A and B show the same stock (${seenA})`);
expect(
  seenA === expected,
  'no change was lost, the later change of the shared ingredient won, the removal arrived',
);

// ================= 4. A second place on the second storage =================
await addPlace(B, 'Parents');
await bind(B, 'Parents', 'S2', folder2);
await mark(B, 'sweet-vermouth');
await syncNow(B, 'Parents');
const parents = await share(B, 'Parents');
await toSync(A);
await A.page.locator('[data-focus="sync-all"]').click();
await pause(2500);
await waitStatus(A, 'Flat', 'synced');
expect((await stockOf(A)).join() === expected, "A's Flat is unchanged by B's second place");
expect((await syncRow(A, 'Parents').count()) === 0, 'A has no place Parents');
expect(
  !outside('A').some((r) => r.url.startsWith(url2) && r.url.includes(parents.code)),
  "A never requested storage 2's file for Parents",
);
expect(
  !outside('A').some((r) => r.url.startsWith(url2) && r.url.endsWith('.json')),
  'A sent no file request to storage 2 at all',
);

// ================= 5. A local-only place on both sides =================
for (const p of [A, B]) {
  await addPlace(p, 'Garage');
  await mark(p, p === A ? 'tequila' : 'vodka');
}
await toSync(A);
await docShot(A, 'sync-page');
const mark5 = external();
await pause(4500);
expect(
  external() === mark5,
  'changes in a local-only place caused no request (after the debounce time)',
);
const allowed = (r) => {
  const base = [url1, url2].find((u) => r.url.startsWith(`${u}/`));
  if (!base) return false;
  const path = r.url.slice(base.length);
  const codes = [flat.code, parents.code].join('|');
  return new RegExp(`^/(\\.mixtura-probe|(${folder1}|${folder2})(/(${codes})\\.json)?/?)$`).test(
    path,
  );
};
const stray = [...outside('A'), ...outside('B')].filter((r) => !allowed(r));
expect(
  stray.length === 0,
  `every request outside the origin went to a storage address and to a bound place's file or folder ${stray.map((r) => r.url)}`,
);
expect(!log.some((r) => r.url.includes('Garage')), 'no request names the local-only place');

// ================= 6. What the storages hold =================
const fetchFile = async (base, folder, code) => {
  const answer = await fetch(`${base}/${folder}/${code}.json`, {
    headers: { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` },
  });
  expect(answer.status === 200, `${base} serves ${folder}/${code}.json`);
  return answer.text();
};
for (const [base, folder, code] of [
  [url1, folder1, flat.code],
  [url2, folder2, parents.code],
]) {
  const text = await fetchFile(base, folder, code);
  const envelope = JSON.parse(text);
  expect(envelope.format === 'materia-sync', 'the stored file is a materia-sync envelope');
  const inner = Buffer.from(envelope.data, 'base64').toString('latin1');
  const secrets = [
    'Flat',
    'Parents',
    'Garage',
    'Home',
    'campari',
    'light-rum',
    'dry-vermouth',
    'lime-juice',
    'sweet-vermouth',
    'simple-syrup',
    'tequila',
    'vodka',
  ];
  expect(
    secrets.every((s) => !text.includes(`"${s}"`) && !inner.includes(s)),
    'it holds no place name and no ingredient id in clear',
  );
}

// ================= 7. Wrong passphrase on join; Stop Syncing =================
await join(A, 'S2', parents, 'AAAA-BBBB-CCCC-DDDD-EEEE');
await A.page.locator('[data-testid="join-problem"]').waitFor();
expect(
  (await A.page.locator('[data-testid="join-problem"]').innerText()).includes('Wrong passphrase'),
  'a wrong passphrase on join is refused in words',
);
await measure(A, 'on the Join a Place sheet with a refusal');
await closeSheet(A);
expect((await syncRow(A, 'Parents').count()) === 0, 'and leaves no place behind');
expect(
  (await A.page.locator('li.sync-row--place').count()) === 3,
  'A still has exactly its three places',
);

await setEntry(A, 'Flat');
await toSync(A);
await A.page.getByRole('button', { name: 'Stop Syncing, Flat' }).click();
await A.page.locator('[data-testid="toast"]').filter({ hasText: 'Stopped syncing Flat' }).waitFor();
expect(
  (await statusOf(A, 'Flat').getAttribute('data-status')) === 'local',
  'Stop Syncing: the place is on this device only',
);
const stopped = external();
await mark(A, 'vodka');
await pause(4500);
expect(external() === stopped, `after Stop Syncing a change causes no request ${stopped}`);
const kept = await stockOf(A);
expect(kept.includes('vodka') && kept.includes('campari'), 'local data stays after Stop Syncing');

// ================= 8. Joining through an invite link =================
const invite = {
  format: 'mixtura-invite',
  version: 1,
  type: 'webdav',
  address: url1,
  folder: folder1,
  place: flat.code,
  passphrase: flat.passphrase,
};
/** A link made by hand, the way the app codes it: `1.` and the base64url of the deflated text. */
const linkOf = (object) =>
  `${site.url}#/join/1.${deflateRawSync(Buffer.from(JSON.stringify(object))).toString('base64url')}`;
const JOIN_SHEET = '#/settings/sync?sheet=join';
const hashOf = (p) => p.page.evaluate(() => location.hash);
/** Opens a link in a running app and waits for the join sheet it is replaced by. */
const openInvite = async (p, link) => {
  await p.page.goto(link);
  await p.page.waitForFunction(() => location.hash === '#/settings/sync?sheet=join');
  await p.page.locator('[data-sheet="join"]').waitFor();
};
const noPayload = async (p, what) => {
  const state = await p.page.evaluate(() => ({
    href: location.href,
    state: JSON.stringify(history.state),
  }));
  expect(
    !state.href.includes('#/join') && !state.href.includes('1.') && !state.state.includes('1.'),
    `${p.who}: the payload is not in the address or the history state ${what}`,
  );
};
const problemOf = (p) => p.page.locator('[data-testid="join-problem"]').innerText();
const bindingCount = (p) =>
  p.page.evaluate(
    () =>
      new Promise((done) => {
        const open = indexedDB.open('mixtura');
        open.onsuccess = () => {
          const all = open.result.transaction('bindings').objectStore('bindings').getAll();
          all.onsuccess = () => {
            open.result.close();
            done(all.result.length);
          };
        };
      }),
  );

// A damaged link, a newer version and a link without passphrase open the sheet empty, with the reason.
const C = await newPerson('C');
await openInvite(C, `${site.url}#/join/1.!!!!`);
expect(
  (await hashOf(C)) === JOIN_SHEET,
  `C: a damaged link is replaced by the join sheet ${await hashOf(C)}`,
);
expect(
  (await problemOf(C)).includes('damaged') &&
    (await C.page.locator('#join-passphrase').inputValue()) === '',
  'C: a damaged link says so and fills nothing',
);
await measure(C, 'on the Join sheet with a damaged invite');
await noPayload(C, 'after a damaged link');
await C.page.goBack();
await C.page.waitForFunction(() => location.hash === '#/stock');
await C.page.goForward();
await C.page.waitForFunction(() => location.hash === '#/settings/sync?sheet=join');
await noPayload(C, 'after Back and Forward');
expect(
  (await C.page.locator('[data-testid="join-problem"]').count()) === 0,
  'C: the reason is forgotten when the sheet is left',
);
await openInvite(C, linkOf({ ...invite, version: 2 }));
expect(
  (await problemOf(C)).includes('newer version of the app'),
  'C: a newer invite says to update the app',
);
await openInvite(C, linkOf({ ...invite, type: 's3' }));
expect(
  (await problemOf(C)).includes('kind of storage this app does not know'),
  'C: an unknown storage type is said',
);
await C.context.close();
const D = await newPerson(
  'D',
  linkOf({ ...invite, passphrase: '' }).slice(site.url.length),
  '[data-sheet="join"]',
);
await D.page.locator('[data-testid="join-problem"]').waitFor();
expect(
  (await hashOf(D)) === JOIN_SHEET &&
    (await problemOf(D)).includes('This invite has no passphrase. Ask for a new invite.'),
  'D: the app opened by a link without passphrase shows the join sheet and says so',
);
await noPayload(D, 'after the app was opened by a link');
await D.context.close();

// A person without storage opens the link: the address is proposed, Add Storage has it filled in.
const E = await newPerson('E');
await openInvite(E, flat.invite);
await noPayload(E, 'after a valid link');
expect(
  (await hashOf(E)) === JOIN_SHEET,
  `E: the link is replaced by the join sheet ${await hashOf(E)}`,
);
const prefilled = async (p, where) => {
  const got = {
    folder: await p.page.locator('#join-folder').inputValue(),
    code: await p.page.locator('#join-code').inputValue(),
    passphrase: await p.page.locator('#join-passphrase').inputValue(),
    type: await p.page.locator('#join-passphrase').getAttribute('type'),
  };
  expect(
    got.folder === flat.folder &&
      got.code === flat.code &&
      got.passphrase === flat.passphrase &&
      got.type === 'password',
    `${p.who}: folder, place code and the masked passphrase are filled in ${where}`,
  );
};
await prefilled(E, 'from the invite');
const proposed = await E.page.locator('[data-testid="join-invite-storage"]').innerText();
expect(
  proposed.includes(`storage at ${url1}`) &&
    (await E.page.locator('#join-storage').count()) === 0 &&
    (await E.page.locator('[data-focus="join-start"]').isDisabled()),
  'E: without a storage the sheet names the address and cannot join yet',
);
await measure(E, 'on the Join sheet from an invite without storage');
expect((await bindingCount(E)) === 0, 'E: nothing is stored before Join is pressed');
await E.page.locator('[data-focus="join-add-storage"]').click();
await E.page.locator('[data-sheet="storage"]').waitFor();
expect(
  (await E.page.locator('#storage-address').inputValue()) === url1,
  'E: Add Storage opens with the invite’s address filled in',
);
await E.page.fill('#storage-label', 'Invited');
await E.page.fill('#storage-user', user);
await E.page.fill('#storage-password', password);
await E.page.locator('[data-focus="storage-save"]').click();
await E.page.locator('[data-sheet="join"]').waitFor();
await E.page.locator('#join-storage').waitFor();
expect(
  (await E.page.locator('#join-storage option:checked').innerText()).startsWith('Invited ·'),
  'E: back on the join sheet the new storage is chosen',
);
await prefilled(E, 'after adding the storage');
expect(
  (await E.page.locator('[data-testid="join-invite-storage"]').count()) === 0,
  'E: the note is gone once a storage has the address',
);
expect((await hashOf(E)) === JOIN_SHEET, 'E: the address is the join sheet again');
await E.page.locator('[data-focus="join-start"]').click();
await E.page.locator('[data-testid="toast"]').filter({ hasText: 'Joined the place' }).waitFor();
await waitStatus(E, 'Flat', 'synced');
await setEntry(E, 'Flat');
expect((await stockOf(E)).join() === expected, 'E: the place arrives with its stock');
await E.context.close();

// A person with the storage configured: it is chosen for the link, and Join works at once.
await openInvite(A, flat.invite);
await prefilled(A, 'from the invite');
expect(
  (await A.page.locator('#join-storage option:checked').innerText()).startsWith('S1 ·') &&
    (await A.page.locator('[data-testid="join-invite-storage"]').count()) === 0,
  'A: the storage at the invite’s address is chosen and no note is shown',
);
await measure(A, 'on the Join sheet from an invite');
await A.page.locator('[data-focus="join-start"]').click();
await A.page.locator('[data-testid="toast"]').filter({ hasText: 'Joined the place' }).waitFor();
await waitStatus(A, 'Flat', 'synced');
expect((await syncRow(A, 'Flat').count()) === 1, 'A: Flat syncs again after joining by link');
expect(
  !(await A.page.evaluate(() => location.href)).includes(flat.passphrase),
  'A: the passphrase is not in the address',
);

console.log(
  `done at ${width}x${height}: ${log.filter((r) => !r.url.startsWith(site.url)).length} requests to the storages`,
);
await A.context.close();
await B.context.close();
await browser.close();
await site.close();
