// The drinks list by keyboard and the pieces around it (#75): the sort menu
// (menu button pattern, order in the address), arrow keys among the rows with
// one tab stop, the `/` and `n` shortcuts (off while typing, off over a
// dialog, off in Settings), Tab kept inside the filters sheet and focus back on
// the Filters button when it closes. Screenshots go to dist/walk/; with --docs
// also to docs/screenshots/ at scale 2.
//
//   node e2e/list-keys.mjs [width height] [--docs]
/* global document, location, innerWidth -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const phone = width < 840;
const OUT = resolve('dist', 'walk');
const DOCS = resolve('..', '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: docs ? 2 : 1,
});
const page = await context.newPage();
page.on('pageerror', (error) => {
  throw error;
});
await throttle(page, args);

const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) });
const docShot = (name) =>
  docs ? page.screenshot({ path: join(DOCS, `app-${name}-${width}x${height}.png`) }) : undefined;
const hash = () => page.evaluate(() => location.hash);
const inHash = (part) =>
  page.waitForFunction((p) => location.hash.includes(p), part, { timeout: 5000 });
const rowNames = () => page.locator('.pane.list .list-rows .row-title').allInnerTexts();
const focusedText = () =>
  page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) ?? '');
const focusedIs = (selector) =>
  page.evaluate((s) => document.activeElement?.matches(s) === true, selector);
const waitRows = () => page.locator('.pane.list .list-rows li').first().waitFor();

await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();

// ---- Sort menu ----
const sortButton = page.getByRole('button', { name: 'Sort, Name' });
expect((await sortButton.getAttribute('aria-haspopup')) === 'menu', 'the sort button has a menu');
expect((await sortButton.getAttribute('aria-expanded')) === 'false', 'the menu starts closed');
// A late redraw (the catalog, the stock) replaces the button: measure it where it stands.
await page.waitForFunction(() => {
  const r = document.querySelector('[data-focus="sort"]')?.getBoundingClientRect();
  return r !== undefined && r.width >= 44 && r.height >= 44;
});
expect(true, 'the sort button is 44 px');
const byName = await rowNames();
await sortButton.click();
const menu = page.getByRole('menu', { name: 'Sort drinks by' });
await menu.waitFor();
expect((await sortButton.getAttribute('aria-expanded')) === 'true', 'the button says it is open');
expect(await focusedIs('[role="menuitemradio"][aria-checked="true"]'), 'focus is on the choice');
expect((await menu.getByRole('menuitemradio').count()) === 3, 'three choices');
for (const item of await menu.getByRole('menuitemradio').all()) {
  const b = await item.boundingBox();
  expect(b !== null && b.height >= 44 && b.width >= 44, 'menu items are 44 px');
}
const inView = await menu.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return r.left >= 0 && r.right <= document.documentElement.clientWidth;
});
expect(inView, 'the menu is inside the window');
await docShot('sort-menu');
await shot('sort-menu');
await page.keyboard.press('ArrowDown');
expect((await focusedText()) === 'Recently changed', 'ArrowDown moves to the next choice');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
expect((await focusedText()) === 'Name', 'the arrow keys wrap around');
await page.keyboard.press('End');
expect((await focusedText()) === 'Template', 'End goes to the last choice');
await page.keyboard.press('Home');
expect((await focusedText()) === 'Name', 'Home goes to the first choice');
await page.keyboard.press('Escape');
await menu.waitFor({ state: 'hidden' });
expect(await focusedIs('[data-focus="sort"]'), 'Escape closes and returns to the button');
expect((await hash()) === '#/drinks', 'Escape in the menu leaves the address alone');
await page.keyboard.press('ArrowDown');
await menu.waitFor();
await page.keyboard.press('Tab');
await menu.waitFor({ state: 'hidden' });
expect(!(await focusedIs('[role="menuitemradio"]')), 'Tab closes the menu and moves on');
await sortButton.click();
await page.mouse.click(5, height - 5);
await menu.waitFor({ state: 'hidden' });
expect(true, 'a click outside closes the menu');

await sortButton.click();
await menu.getByRole('menuitemradio', { name: 'Template' }).click();
await inHash('sort=template');
const byTemplate = await rowNames();
expect(byTemplate.join() !== byName.join(), 'Template changes the order');
expect(
  (await page.locator('.pane.list').innerText()).includes('Sorted by Template'),
  'the list says how it is sorted',
);
expect(await focusedIs('[data-focus="sort"]'), 'focus stays on the sort button after a choice');
await page.getByRole('button', { name: 'Sort, Template' }).click();
expect((await focusedText()) === 'Template', 'the open menu starts at the current choice');
await menu.getByRole('menuitemradio', { name: 'Recently changed' }).click();
await inHash('sort=changed');
await page.getByRole('button', { name: 'Sort, Recently changed' }).click();
await menu.getByRole('menuitemradio', { name: 'Name' }).click();
await page.waitForFunction(() => !location.hash.includes('sort='));
expect((await hash()) === '#/drinks', 'Name is the default and leaves the address');
expect((await rowNames()).join() === byName.join(), 'and brings the name order back');

// The order survives a filter, a reload and opening a drink.
await page.goto(`${site.url}#/drinks?sort=template&q=martini`, { waitUntil: 'load' });
await waitRows();
const afterReload = await rowNames();
expect(afterReload.length > 1, 'a sorted search finds drinks');
await page.locator('.pane.list .list-rows .row').first().click();
await page.waitForFunction(() => location.hash.startsWith('#/drinks/'));
expect((await hash()).includes('sort=template'), 'the order rides along to the spec');
if (!phone) {
  expect(
    (await rowNames()).join() === afterReload.join(),
    'the list beside the spec keeps its order',
  );
}

// ---- Arrow keys, one tab stop ----
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();
const stops = await page.locator('.pane.list .list-rows a.row[tabindex="-1"]').count();
const rowCount = await page.locator('.pane.list .list-rows a.row').count();
expect(stops === rowCount - 1, 'the rows have one tab stop');
await page.getByRole('searchbox').focus();
await page.keyboard.press('ArrowDown');
expect(await focusedIs('.list-rows li:nth-child(1) a.row'), 'ArrowDown from search: first row');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
expect(await focusedIs('.list-rows li:nth-child(3) a.row'), 'ArrowDown moves down');
await page.keyboard.press('ArrowUp');
expect(await focusedIs('.list-rows li:nth-child(2) a.row'), 'ArrowUp moves up');
expect(
  (await page.locator('.pane.list .list-rows a.row[tabindex="-1"]').count()) === rowCount - 1,
  'the tab stop moves with the focus',
);
await page.keyboard.press('End');
expect(await focusedIs(`.list-rows li:nth-child(${rowCount}) a.row`), 'End: last loaded row');
await page.keyboard.press('ArrowDown');
// The button loads more rows when it comes near, and then hands focus to the first new row.
await page.waitForFunction(
  (n) =>
    document.activeElement?.classList.contains('more-button') ||
    document.querySelectorAll('.pane.list .list-rows a.row').length > n,
  rowCount,
);
expect(true, 'ArrowDown from the last row: Show more drinks');
await page.locator('.pane.list .list-rows a.row').last().focus();
await page.keyboard.press('Home');
expect(await focusedIs('.list-rows li:nth-child(1) a.row'), 'Home: first row');
await page.keyboard.press('ArrowUp');
expect(await focusedIs('[data-focus="search"]'), 'ArrowUp from the first row: search');
await page.keyboard.press('ArrowDown');
const first = await focusedText();
await page.keyboard.press('Enter');
await page.waitForFunction(() => location.hash.startsWith('#/drinks/'));
expect(
  (await page.locator('.fr-header h1').last().innerText()).length > 0 && first.length > 0,
  'Enter opens the focused drink',
);

// ---- Shortcuts ----
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('/');
expect(await focusedIs('[data-focus="search"]'), '/ focuses the search field');
await page.keyboard.type('n/n');
expect((await page.getByRole('searchbox').inputValue()) === 'n/n', 'typing is not a shortcut');
expect((await hash()).startsWith('#/drinks') && !(await hash()).includes('new'), 'no navigation');
await page.getByRole('searchbox').fill('');
await page.waitForFunction(() => !location.hash.includes('q='));
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('Control+n');
expect(!(await hash()).includes('new'), 'Ctrl+N is left to the browser');
await page.keyboard.press('n');
await page.waitForFunction(() => location.hash === '#/drinks/new');
expect(true, 'n starts a new drink');
await page.keyboard.press('n');
expect(
  (await hash()) === '#/drinks/new',
  `n does nothing where the list is not shown ${await hash()}`,
);

// A search typed just before the user leaves the list lands after the 200 ms debounce:
// it must not throw them back to the list.
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();
await page.getByRole('searchbox').focus();
await page.keyboard.type('gin');
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('n');
await page.waitForFunction(() => location.hash === '#/drinks/new');
await page.waitForTimeout(800);
expect(
  (await hash()) === '#/drinks/new',
  `a late search does not leave the new drink ${await hash()}`,
);

// Off over a dialog (a fresh page: the editor left a draft behind).
await page.goto('about:blank');
await page.goto(`${site.url}#/drinks?sheet=filters`, { waitUntil: 'load' });
await page.getByRole('dialog', { name: 'Filters' }).waitFor();
await page.keyboard.press('n');
expect((await hash()).includes('sheet=filters'), `n is off while a dialog is open ${await hash()}`);

// Switched off in Settings (WCAG 2.1.4).
await page.goto(`${site.url}#/settings`, { waitUntil: 'load' });
const settingsGroup = page.getByRole('group', { name: 'Keyboard shortcuts' });
await settingsGroup.getByRole('button', { name: 'No' }).click();
expect(
  (await settingsGroup.getByRole('button', { name: 'No' }).getAttribute('aria-pressed')) === 'true',
  'Settings turns shortcuts off',
);
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('n');
await page.keyboard.press('/');
expect((await hash()) === '#/drinks', 'with shortcuts off n does nothing');
expect(!(await focusedIs('[data-focus="search"]')), 'and / does nothing');
await page.reload({ waitUntil: 'load' });
await waitRows();
await page.keyboard.press('n');
expect((await hash()) === '#/drinks', 'the choice survives a reload');
await page.goto(`${site.url}#/settings`, { waitUntil: 'load' });
await settingsGroup.getByRole('button', { name: 'Yes' }).click();

// ---- Filters sheet: Tab stays inside, focus returns ----
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();
const opener = page.getByRole('button', { name: 'Filters', exact: true });
await opener.focus();
await page.keyboard.press('Enter');
const sheet = page.getByRole('dialog', { name: 'Filters' });
await sheet.waitFor();
await page.waitForFunction(() => document.activeElement?.hasAttribute('data-sheet'));
const inside = () =>
  page.evaluate(() => document.querySelector('[data-sheet]')?.contains(document.activeElement));
const total = await sheet.evaluate((el) => el.querySelectorAll('button:not([disabled])').length);
const seen = new Set();
for (let i = 0; i < total + 3; i++) {
  await page.keyboard.press('Tab');
  expect(await inside(), 'Tab stays inside the filters sheet');
  seen.add(await page.evaluate(() => document.activeElement?.textContent?.trim()));
}
expect(seen.size > 3, 'Tab walks the controls of the sheet');
await page.keyboard.press('Shift+Tab');
expect(await inside(), 'Shift+Tab stays inside');
await page.evaluate(() => document.querySelector('[data-sheet]')?.focus());
await page.keyboard.press('Shift+Tab');
expect(
  await page.evaluate(() => document.activeElement?.textContent?.includes('Show')),
  'Shift+Tab from the dialog goes to the last control',
);
await page.keyboard.press('Tab');
expect(await focusedIs('[data-focus="back"]'), 'Tab from the last control goes to the first');
await page.keyboard.press('Shift+Tab');
expect(await inside(), 'Shift+Tab from the first control wraps');
await page.getByRole('button', { name: 'Close filters' }).click();
await sheet.waitFor({ state: 'detached' });
await page.waitForFunction(() => document.activeElement?.getAttribute('data-focus') === 'filters');
expect(true, 'closing the sheet returns focus to the Filters button');
// Escape does the same.
await page.keyboard.press('Enter');
await sheet.waitFor();
await page.keyboard.press('Escape');
await sheet.waitFor({ state: 'detached' });
await page.waitForFunction(() => document.activeElement?.getAttribute('data-focus') === 'filters');
expect(true, 'Escape returns focus to the Filters button');

// ---- Template detail: New Drink starts from the template ----
// A blank New Drink was open first: it must not be shown where a template was chosen.
await page.goto(`${site.url}#/drinks/new`, { waitUntil: 'load' });
await page.getByRole('button', { name: 'Add Ingredient' }).waitFor();
expect((await page.getByText('Empty line from the template').count()) === 0, 'a blank new drink');
await page.evaluate(() => {
  location.hash = '#/templates/martini';
});
await page.getByRole('link', { name: 'New Drink' }).click();
await page.waitForFunction(() => location.hash === '#/drinks/new?template=martini');
// The editor says "New Drink" while it still loads: wait for the slots themselves.
await page.getByText('Empty line from the template').first().waitFor();
expect(true, 'New Drink from a template opens the editor with its slots');
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await waitRows();

const small = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('.pane.list button, .pane.list a.btn')) {
    const r = el.getBoundingClientRect();
    if (r.width && (r.width < 43.5 || r.height < 43.5)) bad.push(el.getAttribute('aria-label'));
  }
  return bad;
});
expect(small.length === 0, `list buttons are 44 px ${small}`);
const sideways = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
expect(!sideways, 'no sideways scrolling');

await browser.close();
await site.close();
console.log(`list-keys ${width}x${height} ok`);
