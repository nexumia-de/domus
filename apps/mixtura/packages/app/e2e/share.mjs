// Share one drink by link in a real browser: make a drink with a custom
// ingredient, a riff of it, share the riff, open the link in a fresh browser
// context (empty storage), see the preview, add it, find the riff with its
// parent and the custom ingredient; the payload leaves the address bar and
// the history, a reload shows the start, the same link again duplicates
// nothing; damaged links show an error state.
//
//   node e2e/share.mjs [width height] [--slow-frames=MS] [--throttle=N]
/* global document, location, history, indexedDB, innerWidth -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';
import { readSpaces, readStock } from './stock-db.mjs';

const args = process.argv.slice(2);
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });
const shot = (page, name) =>
  page.screenshot({ path: join(OUT, `share-${name}-${width}x${height}.png`) });

const site = await serve();
const browser = await launch();
const external = [];
const newPage = async (permissions = []) => {
  const context = await browser.newContext({ viewport: { width, height }, permissions });
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
const open = async (page, address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.fr-header h1').last().waitFor({ timeout: 5000 });
};
const dump = (page) =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const request = indexedDB.open('mixtura');
        request.onerror = () => rej(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const names = ['specs', 'ingredients', 'templates'];
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
// Measured inside the page in one step: a late redraw replaces elements, and a locator
// would hand over one that is already gone (see the comment in e2e/walk.mjs).
const noOverflow = async (page, where) => {
  const bad = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > innerWidth) return 'page';
    for (const el of document.querySelectorAll('.pane-scroll, .sheet-scroll'))
      if (el.scrollWidth > el.clientWidth) return el.className;
    return '';
  });
  expect(bad === '', `no horizontal scrolling ${where} (${bad})`);
};
const targets = async (page, selector, where) => {
  const small = await page.evaluate((sel) => {
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.width < 44 || r.height < 44)
        out.push(
          `${el.textContent?.trim() || el.getAttribute('aria-label')} ${Math.round(r.width)}x${Math.round(r.height)}`,
        );
    }
    return out;
  }, selector);
  expect(small.length === 0, `touch targets are at least 44 x 44 ${where}: ${small.join('; ')}`);
};

// ---- The sender: a drink with a custom ingredient, and a riff of it ----
const sender = await newPage(['clipboard-read', 'clipboard-write']);
await open(sender, '#/drinks/new');
const cards = sender.locator('[data-line-card]');
const sheetClosed = () => sender.waitForFunction(() => !location.hash.includes('sheet='));
await sender.locator('input#name').fill('Hibiscus Cooler');
await sender.getByRole('button', { name: 'Add Ingredient' }).click();
await sender.locator('[data-focus="pick-search"]').fill('hibiscus tea');
await sender.getByRole('button', { name: /^Create “hibiscus tea”/ }).click();
await sender.locator('.ingredient-sheet').waitFor();
await sender.locator('#f-parentId').selectOption({ label: 'Infusions' });
await sender.getByRole('button', { name: 'Save Ingredient' }).click();
await sender.locator('.ingredient-sheet').waitFor({ state: 'detached' });
await sheetClosed();
await sender.keyboard.type('40 ml');
await sender.getByRole('button', { name: 'Add Ingredient' }).click();
await sender.locator('[data-focus="pick-search"]').fill('lime juice');
await sender.locator('[data-focus="pick-search"]').press('Enter');
await sheetClosed();
await sender.keyboard.type('20 ml');
await sender.locator('[data-action="save"]').click();
await sender.locator('.spec').waitFor({ timeout: 5000 });

// The parent shows Share, and its link is short.
expect(
  (await sender.locator('[data-focus="share"]').count()) === 1,
  'a drink of the user has a Share button',
);
const parentLineage = decodeURIComponent(await sender.evaluate(() => location.hash)).split('/')[2];

// A riff of it: one line changes.
await sender.locator('[data-focus="riff"]').click();
await sender.locator('.editor').waitFor();
await sender.locator('input#name').fill('Hibiscus Cooler riff');
await cards.nth(1).locator('input[name="amount"]').fill('25 ml');
await sender.locator('[data-action="save"]').click();
await sender.locator('.spec').waitFor({ timeout: 5000 });
const senderData = await dump(sender);
const parent = senderData.specs.find((s) => s.name === 'Hibiscus Cooler');
const riff = senderData.specs.find((s) => s.name === 'Hibiscus Cooler riff');
const custom = senderData.ingredients.find((i) => i.name === 'hibiscus tea');
expect(riff.parentId === parent.id, 'the riff has the parent as its parent');
expect(parentLineage === parent.lineageId, 'the parent lineage was read');

// ---- Share the riff ----
const shareButton = sender.locator('[data-focus="share"]');
const sizes = await sender.evaluate(() => {
  const r = document.querySelector('[data-focus="share"]').getBoundingClientRect();
  return { w: r.width, h: r.height };
});
expect(
  sizes.w >= 44 && sizes.h >= 44,
  `the Share button is at least 44 x 44 (${sizes.w}x${sizes.h})`,
);
await shareButton.click();
const sheet = sender.getByTestId('share-sheet');
await sheet.waitFor();
const linkField = sender.getByTestId('share-link');
await linkField.waitFor();
const url = await linkField.inputValue();
expect(
  (await sender.evaluate(() => location.hash)).includes('sheet=share'),
  'the sheet is in the address, so Back closes it',
);
expect(
  (await sheet.innerText()).includes('Share Hibiscus Cooler riff'),
  'the sheet names the drink',
);
expect(
  url.startsWith(`${site.url}#/share/1.`),
  `the link is the app address, #/share/ and a version 1 payload (${url.slice(0, 60)})`,
);
console.log(`link length for the riff with one custom ingredient: ${url.length}`);
expect(url.length < 8000, 'the link is under the limit');
expect((await linkField.getAttribute('readonly')) !== null, 'the link field is read-only');
await shot(sender, 'sheet');
await noOverflow(sender, 'in the share sheet');
await targets(
  sender,
  '[data-testid="share-sheet"] .btn, [data-testid="share-sheet"] input',
  'in the sheet',
);
await sender.getByRole('button', { name: 'Copy Link' }).click();
await sender.getByTestId('share-note').waitFor();
expect((await sender.getByTestId('share-note').innerText()) === 'Link copied', 'Copy Link says so');
expect(
  (await sender.evaluate(() => navigator.clipboard.readText())) === url,
  'the clipboard holds the link',
);
// Closing: Back (or the close button) returns to the drink.
await sender.getByRole('button', { name: 'Close' }).click();
await sheet.waitFor({ state: 'detached' });
expect(
  !(await sender.evaluate(() => location.hash)).includes('sheet='),
  'closing the sheet leaves the drink address',
);
// A built-in drink has nothing to send.
await open(sender, '#/drinks?q=daiquiri');
await sender
  .locator('a.row', { hasText: /^Daiquiri/ })
  .first()
  .click();
await sender.locator('.spec').waitFor();
expect(
  (await sender.locator('[data-focus="share"]').count()) === 0,
  'a built-in drink has no Share button',
);

// ---- The receiver: a fresh context ----
const receiver = await newPage();
await receiver.goto(url, { waitUntil: 'load' });
const preview = receiver.getByTestId('import-preview');
await preview.waitFor({ timeout: 5000 });
const text = await preview.innerText();
expect(
  text.includes('Somebody sent you Hibiscus Cooler riff'),
  `the preview says who it is (${text})`,
);
expect(
  !(await receiver.evaluate(() => location.hash)).includes('1.'),
  'the payload is gone from the address bar',
);
expect(
  (await receiver.evaluate(() => location.hash)) === '#/share',
  'the address is #/share while the preview shows',
);
expect(
  (await receiver.evaluate(() => history.length)) <= 2 &&
    !(await receiver.evaluate(() => JSON.stringify(history.state))).includes('1.'),
  'the payload is not in the history',
);
expect(
  (await receiver.getByRole('button', { name: 'Replace Everything' }).count()) === 0,
  'the share preview offers no Replace',
);
await shot(receiver, 'preview');
await noOverflow(receiver, 'in the preview');
await targets(receiver, '[data-testid="import-preview"] .btn', 'in the preview');
await receiver.getByRole('button', { name: 'Add Drink' }).click();
await receiver.locator('.spec').waitFor({ timeout: 5000 });
const tags = await receiver.locator('.tags .tag').allInnerTexts();
expect(tags.includes('Riff of Hibiscus Cooler'), `the riff names its parent (${tags})`);
const after = await dump(receiver);
expect(
  after.specs.length === 2 &&
    after.specs.some((s) => s.name === 'Hibiscus Cooler' && s.lineageId === parent.lineageId) &&
    after.specs.some((s) => s.name === 'Hibiscus Cooler riff' && s.parentId === parent.id),
  'the riff and its parent are stored with their ids',
);
expect(
  after.ingredients.length === 1 && after.ingredients[0].id === custom.id,
  'the custom ingredient came along, the unused ones did not',
);
const spacesAfter = await readSpaces(receiver);
expect(
  (await readStock(receiver)).length === 0 &&
    spacesAfter.length <= 1 &&
    spacesAfter.every((s) => s.name === 'Home' && s.storage.type === 'device'),
  'no stock came along, and no space beside the one the app makes',
);
await receiver.getByRole('link', { name: /^Family/ }).waitFor();
await shot(receiver, 'added');
// Undo is offered as for a file import.
expect(
  (await receiver.locator('.fr-toast').innerText()).includes('Imported'),
  'the toast says what was added',
);
expect(
  (await receiver.locator('.fr-toast button', { hasText: 'Undo' }).count()) === 1,
  'the toast offers Undo',
);

// Reload: the normal start, nothing applied twice.
await receiver.reload({ waitUntil: 'load' });
await receiver.locator('.fr-header h1').last().waitFor();
expect(
  (await receiver.evaluate(() => location.hash)).startsWith('#/drinks'),
  'a reload after reading shows the normal start',
);
expect((await dump(receiver)).specs.length === 2, 'a reload applies nothing again');

// The same link again: nothing would change, nothing is duplicated.
await receiver.goto('about:blank');
await receiver.goto(url, { waitUntil: 'load' });
await receiver.getByTestId('import-preview').waitFor({ timeout: 5000 });
expect(
  (await receiver.getByTestId('share-summary').innerText()).includes('already have'),
  'the same link says you already have it',
);
expect(
  await receiver.getByRole('button', { name: 'Add Drink' }).isDisabled(),
  'Add Drink is off when nothing would change',
);
await receiver.getByRole('button', { name: 'Close' }).click();
await receiver.locator('.fr-header h1').last().waitFor();
const again = await dump(receiver);
expect(again.specs.length === 2 && again.ingredients.length === 1, 'nothing is duplicated');

// A link pasted into the address bar of the running app works too.
await receiver.evaluate((hash) => {
  location.hash = hash;
}, url.split('#')[1]);
await receiver.getByTestId('import-preview').waitFor({ timeout: 5000 });
expect(
  (await receiver.evaluate(() => location.hash)) === '#/share',
  'a pasted link leaves the address too',
);
await receiver.getByRole('button', { name: 'Close' }).click();

// ---- Damaged links ----
const payload = url.split('#/share/')[1];
const broken = {
  'cut off': `${payload.slice(0, Math.floor(payload.length / 2))}`,
  'not a payload': '1.%%%%',
  'newer version': `2.${payload.slice(2)}`,
};
for (const [name, bad] of Object.entries(broken)) {
  const page = await newPage();
  await page.goto(`${site.url}#/share/${bad}`, { waitUntil: 'load' });
  const error = page.getByTestId('import-error');
  await error.waitFor({ timeout: 5000 });
  const message = await error.innerText();
  expect(
    message.length > 20 && (await dump(page)).specs.length === 0,
    `${name}: one clear error, nothing added (${message.replace(/\n/g, ' | ')})`,
  );
  if (name === 'cut off') {
    await shot(page, 'error');
    await noOverflow(page, 'in the error state');
    await targets(page, '.status .btn, .stack > .btn', 'in the error state');
  }
  expect(
    (await page.evaluate(() => location.hash)) === '#/share',
    `${name}: the payload leaves the address`,
  );
  await page.context().close();
}

expect(external.length === 0, `no request left the origin (${external.join(', ')})`);
await browser.close();
await site.close();
