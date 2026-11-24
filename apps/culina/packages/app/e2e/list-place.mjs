// The way back to a list returns to the place in it (docs/behaviour.md, Cook: the way back;
// Navigation: the place on the way back), in a browser on the real shipped files and an empty
// notebook, at 360 x 720, in English: a dessert far down Cook's list is opened and left by the
// browser's back, by "Back to the list", and by "Back to the list" after the cook screen and back;
// each time the page stands where it stood (within 4 px), the row is between the header and the
// bottom bar and its link has the focus. A component of the Notebook's list, by the browser's back,
// the same. The controls: a screen reached forward (the dish, the navigation's Notebook and Cook)
// starts at the top with its heading focused. The list changed meanwhile in another tab (the
// filter now "Main course", the dessert gone): no error, a row in view has the focus. Chromium
// only; no screen reader, no real phone, no touch scrolling (the page is scrolled by script).
import { check, watch } from './harness.mjs';
import { open } from './editor-helpers.mjs';

const near = (a, b) => Math.abs(a - b) <= 4;

/** Scrolls the row to the middle of the page; gives its href and the page's scroll. */
const scrollTo = async (row) => {
  await row.evaluate((a) => a.scrollIntoView({ block: 'center' }));
  return row.evaluate((a) => ({ href: a.getAttribute('href'), y: window.scrollY }));
};

/** Where the page stands: its scroll, the focused element, whether `href`'s link is in view. */
const where = (page, href) =>
  page.evaluate((href) => {
    const active = document.activeElement;
    const link = [...document.querySelectorAll('main a[href]')].find(
      (a) => a.getAttribute('href') === href,
    );
    const header = document.querySelector('.app-header').getBoundingClientRect();
    const nav = document.querySelector('.app-nav').getBoundingClientRect();
    const box = link?.getBoundingClientRect();
    const band = { top: header.bottom, bottom: nav.top > 0 ? nav.top : window.innerHeight };
    return {
      y: window.scrollY,
      inView: box !== undefined && box.top >= band.top - 1 && box.bottom <= band.bottom + 1,
      focused: active === link && link !== undefined,
      active: `${active?.tagName}:${active?.getAttribute('href') ?? active?.textContent}`,
    };
  }, href);

const cookReady = (page) =>
  page.waitForFunction(
    () => location.hash === '#/cook' && document.querySelectorAll('.dish-row').length > 0,
  );

const placeKept = (got, before, label) =>
  check(
    near(got.y, before.y) && got.inView && got.focused,
    `${label}: the list stands where it stood (${got.y} for ${before.y}), the row in view (${got.inView}), its link focused (${got.active})`,
  );

const atTop = async (page, label) => {
  const got = await page.evaluate(() => ({
    y: window.scrollY,
    heading: document.activeElement?.tagName === 'H1',
  }));
  check(got.y === 0 && got.heading, `${label}: at the top, the heading focused (${got.y})`);
};

export const listPlace = async (browser, server) => {
  const label = '360px list place';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await open(page, server.origin, 'cook');
  await page.locator('.dish-group').first().waitFor();
  const desserts = page
    .locator('.dish-group', { has: page.locator('.dish-group-heading', { hasText: /^Dessert/ }) })
    .locator('a.dish-row');
  const row = desserts.first();
  const name = await row.locator('.entry-name').innerText();
  const before = await scrollTo(row);
  check(before.y > 2000, `${label}: the dessert ${name} is far down the list (${before.y})`);

  // The browser's back.
  await row.click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  await atTop(page, `${label}: the dish, reached forward`);
  await page.goBack();
  await cookReady(page);
  placeKept(await where(page, before.href), before, `${label}: browser back from ${name}`);

  // "Back to the list".
  await row.click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await cookReady(page);
  placeKept(await where(page, before.href), before, `${label}: Back to the list from ${name}`);

  // Cooking step by step, back to the dish, then "Back to the list".
  await row.click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.waitForFunction(() => location.hash.endsWith('/cook'));
  await page.goBack();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await cookReady(page);
  placeKept(
    await where(page, before.href),
    before,
    `${label}: after cooking step by step, Back to the list from ${name}`,
  );

  // The controls: forward from the navigation starts at the top, Cook included.
  await page.locator('.app-nav').getByRole('link', { name: 'Notebook' }).click();
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  await atTop(page, `${label}: the Notebook from the navigation`);
  await page.locator('.app-nav').getByRole('link', { name: 'Cook' }).click();
  await cookReady(page);
  await atTop(page, `${label}: Cook from the navigation, after the list was left far down`);

  // The Notebook's Components: a shipped component far down, opened and left by the browser's back.
  await page.locator('.app-nav').getByRole('link', { name: 'Notebook' }).click();
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  const component = page.locator('main a.row-link').last();
  const cName = await component.locator('.entry-name').innerText();
  const cBefore = await scrollTo(component);
  await component.click();
  await page.getByRole('heading', { level: 1, name: cName }).waitFor();
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  placeKept(await where(page, cBefore.href), cBefore, `${label}: browser back from ${cName}`);

  // The list changed meanwhile: another tab chooses "Main course"; the dessert is gone.
  await page.locator('.app-nav').getByRole('link', { name: 'Cook' }).click();
  await cookReady(page);
  await scrollTo(row);
  await row.click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  const other = await context.newPage();
  await open(other, server.origin, 'cook');
  const fold = other.locator('details.dish-filter-fold');
  if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click();
  await other.getByLabel('Course', { exact: true }).selectOption({ label: 'Main course' });
  await other.close();
  await page.goBack();
  await cookReady(page);
  const changed = await page.evaluate(() => {
    const active = document.activeElement;
    const box = active?.getBoundingClientRect();
    const nav = document.querySelector('.app-nav').getBoundingClientRect();
    return {
      rows: document.querySelectorAll('.dish-row').length,
      row: active?.matches('a.dish-row') === true,
      inView: box !== undefined && box.top >= 0 && box.bottom <= nav.top + 1,
      text: active?.textContent,
    };
  });
  check(
    changed.row && changed.inView,
    `${label}: the row gone (filter changed in another tab), a row in view takes the focus (${changed.text}, ${changed.rows} rows)`,
  );
  // The filter back as it was, for the checks after this one.
  await openFilterAndReset(page);
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};

const openFilterAndReset = async (page) => {
  const fold = page.locator('details.dish-filter-fold');
  if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click();
  await page.getByLabel('Course', { exact: true }).selectOption({ label: 'Any course' });
};
