// A save that is cut off must not lose the user's edit. Each scenario holds one
// store request of the save open (the request is issued, the transaction stays
// uncommitted), then ends the page the way a phone does when it kills the app:
// no pagehide, no visibilitychange. After reopening, either the save is
// complete or the draft is intact and offered for restore; never neither.
//
// The hold is a wrapper around IDBObjectStore.prototype in the page (no app
// code, no sleeps): the wrapped call keeps its transaction alive with a chain
// of reads and signals `window.__held`; the test waits for that signal.
//
//   node e2e/save-interrupt.mjs [width height] [--throttle=N] [--slow-frames=MS]
/* global window, document, location, indexedDB, IDBObjectStore -- in functions the page runs */
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);

const site = await serve();
const browser = await launch();

/** Installed before the app: the hold, the lifecycle switch and the debounce switch. */
function installHooks() {
  window.__held = false;
  window.__hold = null;
  const real = {
    put: IDBObjectStore.prototype.put,
    delete: IDBObjectStore.prototype.delete,
  };
  for (const op of ['put', 'delete']) {
    IDBObjectStore.prototype[op] = function (...rest) {
      const hold = window.__hold;
      if (!hold || hold.store !== this.name || hold.op !== op || (hold.once && hold.done)) {
        return real[op].apply(this, rest);
      }
      hold.done = true;
      window.__held = true;
      let released = false;
      const keepAlive = () => {
        const probe = this.get('__keep-alive__');
        probe.addEventListener('success', () => {
          if (!released) keepAlive();
        });
        return probe;
      };
      return keepAlive();
    };
  }
  // A killed app gets no lifecycle events: the app's own flush must not be what saves the edit.
  const add = window.addEventListener.bind(window);
  window.addEventListener = (type, ...rest) =>
    window.__noLifecycle && type === 'pagehide' ? undefined : add(type, ...rest);
  const addDoc = document.addEventListener.bind(document);
  document.addEventListener = (type, ...rest) =>
    window.__noLifecycle && type === 'visibilitychange' ? undefined : addDoc(type, ...rest);
  window.__noLifecycle = true;
  // The editor writes its draft 300 ms after the last change; a save within that time has no draft yet.
  const timeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...rest) =>
    window.__noDebounce && ms === 300 ? timeout(fn, 1e9) : timeout(fn, ms, ...rest);
}

const dump = (page) =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const request = indexedDB.open('mixtura');
        request.onerror = () => rej(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const names = ['specs', 'ingredients', 'drafts'];
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

async function fresh() {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.addInitScript(installHooks);
  await throttle(page, args);
  return { context, page };
}

const open = async (page, address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
};
const sheetClosed = (page) => page.waitForFunction(() => !location.hash.includes('sheet='));
const addLine = async (page, search, amount) => {
  await page.getByRole('button', { name: 'Add Ingredient' }).click();
  const field = page.locator('[data-focus="pick-search"]');
  await field.waitFor();
  await field.fill(search);
  await field.press('Enter');
  await page.locator('.picker-sheet').waitFor({ state: 'detached' });
  await sheetClosed(page);
  await page.locator('[data-focus^="amount-"]').waitFor();
  await page.keyboard.type(amount);
};
/** Clicks Save; a changed drink first asks for a note, which is skipped. */
const pressSave = async (page) => {
  await page.locator('[data-action="save"]').click();
  const skip = page.locator('[data-action="save-skip"]');
  const done = page.locator('.spec');
  await skip.or(done).first().waitFor({ timeout: 5000 });
  if (await skip.isVisible()) await skip.click();
};
/** A saved first version of a plain drink, then the editor open on it. */
const savedDrink = async (page, name) => {
  await open(page, '#/drinks/new');
  await page.locator('input#name').fill(name);
  await addLine(page, 'light rum', '60 ml');
  await page.locator('[data-action="save"]').click();
  await page.locator('.spec').waitFor({ timeout: 5000 });
  await page.waitForFunction(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const g = r.result.transaction('drafts').objectStore('drafts').count();
          g.onsuccess = () => {
            r.result.close();
            res(g.result === 0);
          };
        };
      }),
  );
};
const hold = async (page, store, op, extra = {}) => {
  await page.evaluate(
    ([s, o, e]) => {
      window.__held = false;
      window.__hold = { store: s, op: o, ...e };
    },
    [store, op, extra],
  );
};
const waitHeld = (page) => page.waitForFunction(() => window.__held === true);

/**
 * After the kill: reopen the editor at `address` and report where the edit is.
 * `saved` says what the stored spec of `name` holds; `draft` whether the editor offers it back.
 */
async function reopened(page, name, address, amountText) {
  await page.reload({ waitUntil: 'load' });
  const stored = await dump(page);
  const spec = stored.specs
    .filter((s) => s.name === name)
    .sort((a, b) => a.version - b.version)
    .at(-1);
  const savedAmount = spec?.lines[0]?.amount;
  const saved = savedAmount === amountText.number && spec.version === amountText.version;
  let restored = false;
  if (stored.drafts.length > 0) {
    await open(page, address);
    await page.locator('.editor').waitFor({ timeout: 5000 });
    const notice = page.locator('[data-restored]');
    await notice.waitFor({ timeout: 5000 }).catch(() => undefined);
    const typed = await page.locator('[data-line-card] input[name="amount"]').first().inputValue();
    restored = (await notice.count()) > 0 && typed === amountText.text;
  }
  return { saved, restored, drafts: stored.drafts.length };
}

const either = (name, r) =>
  expect(
    r.saved || r.restored,
    `${name}: after the interruption the save is complete (${r.saved}) or the draft is offered back (${r.restored}), never neither`,
  );

// 1. A new drink, saved before the debounce wrote any draft; the version write is cut off.
{
  const { context, page } = await fresh();
  await open(page, '#/drinks/new');
  await page.evaluate(() => {
    window.__noDebounce = true;
  });
  await page.locator('input#name').fill('Cut Off');
  await addLine(page, 'light rum', '45 ml');
  await hold(page, 'specs', 'put');
  await page.locator('[data-action="save"]').click();
  await waitHeld(page);
  const r = await reopened(page, 'Cut Off', '#/drinks/new', {
    number: 45,
    version: 1,
    text: '45 ml',
  });
  either('new drink, version write held', r);
  await context.close();
}

// 2. An existing drink, a new version: the version write is cut off.
{
  const { context, page } = await fresh();
  await savedDrink(page, 'Cut Twice');
  const lineage = (await dump(page)).specs.find((s) => s.name === 'Cut Twice').lineageId;
  await open(page, `#/drinks/${lineage}/edit`);
  await page.locator('.editor').waitFor();
  await page.evaluate(() => {
    window.__noDebounce = true;
  });
  await page.locator('[data-line-card] input[name="amount"]').first().fill('50 ml');
  await hold(page, 'specs', 'put');
  await pressSave(page);
  await waitHeld(page);
  const r = await reopened(page, 'Cut Twice', `#/drinks/${lineage}/edit`, {
    number: 50,
    version: 2,
    text: '50 ml',
  });
  either('new version, version write held', r);
  await context.close();
}

// 3. The version has committed, the draft is not yet deleted.
{
  const { context, page } = await fresh();
  await savedDrink(page, 'Cut After');
  const lineage = (await dump(page)).specs.find((s) => s.name === 'Cut After').lineageId;
  await open(page, `#/drinks/${lineage}/edit`);
  await page.locator('.editor').waitFor();
  await page.locator('[data-line-card] input[name="amount"]').first().fill('55 ml');
  await hold(page, 'drafts', 'delete');
  await pressSave(page);
  await waitHeld(page);
  const r = await reopened(page, 'Cut After', `#/drinks/${lineage}/edit`, {
    number: 55,
    version: 2,
    text: '55 ml',
  });
  expect(r.saved, 'version committed before the draft was deleted: the save is complete');
  await context.close();
}

// 4. A prepared ingredient: the spec has committed, its ingredient record is cut off.
{
  const { context, page } = await fresh();
  await open(page, '#/drinks/new');
  await page.evaluate(() => {
    window.__noDebounce = true;
  });
  await page.locator('input#name').fill('Cut Syrup');
  await page.locator('#prepared-toggle').check();
  await addLine(page, 'simple syrup', '100 ml');
  await page.locator('input#yield').fill('120 ml');
  await hold(page, 'ingredients', 'put');
  await page.locator('[data-action="save"]').click();
  await waitHeld(page);
  const r = await reopened(page, 'Cut Syrup', '#/drinks/new', {
    number: 100,
    version: 1,
    text: '100 ml',
  });
  const stored = await dump(page);
  const record = stored.ingredients.some((i) => i.name === 'Cut Syrup');
  expect(
    (r.saved && record) || r.restored,
    `prepared ingredient: complete (${r.saved && record}) or draft offered back (${r.restored})`,
  );
  await context.close();
}

await browser.close();
await site.close();
console.log('save-interrupt: done');
