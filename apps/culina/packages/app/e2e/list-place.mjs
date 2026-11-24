// The way back to a list returns to the place in it (docs/behaviour.md, Cook: the way back;
// Navigation: the place on the way back), in a browser on the real shipped files and an empty
// notebook, at 360 x 720, in English. A dessert far down Cook's list is put near the top of the
// band between the header and the bottom bar (not in its middle, where centring the link would
// land too), opened and left by the browser's back, by "Back to the list", and by "Back to the
// list" after the cook screen and back; each time the page stands where it stood (within 1 px),
// the row is in the band and its link has the focus. Back, forward and back again: the dish where
// it was scrolled to, the list where it was with the row focused. Left by the navigation and back:
// the scroll as it was and a link in the band focused, not the heading far above. A link opened
// in a new tab (Ctrl) is not the link the screen was left by. A component of the Notebook's list,
// by the browser's back, the same. The controls: a screen reached forward (the dish, the
// navigation's Notebook and Cook) starts at the top with its heading focused. The list changed
// meanwhile in another tab (the filter now "Main course", the dessert gone): no error, a row in the
// band has the focus. Chromium only; no screen reader, no real phone, no touch scrolling (the page
// is scrolled by script).
import { check, watch } from './harness.mjs';
import { open } from './editor-helpers.mjs';

const near = (a, b) => Math.abs(a - b) <= 1;

/** In the page: the band of the window main is not covered in (header and bar over main). */
const installBand = (context) =>
  context.addInitScript(() => {
    window.e2eBand = () => {
      const main = document.querySelector('main').getBoundingClientRect();
      const over = (r) => r.right > main.left + 1 && r.left < main.right - 1;
      const header = document.querySelector('.app-header').getBoundingClientRect();
      const nav = document.querySelector('.app-nav').getBoundingClientRect();
      return {
        top: over(header) ? header.bottom : 0,
        bottom: over(nav) && nav.top > innerHeight / 2 ? nav.top : innerHeight,
      };
    };
  });

/** Puts the row 40 px below the top of the band; gives its href and the page's scroll. */
const placeRow = (row) =>
  row.evaluate((a) => {
    const band = window.e2eBand();
    window.scrollTo(0, a.getBoundingClientRect().top + window.scrollY - band.top - 40);
    return { href: a.getAttribute('href'), y: window.scrollY };
  });

/** Where the page stands: its scroll, the focused element, whether it is in the band. */
const where = (page, href) =>
  page.evaluate((href) => {
    const band = window.e2eBand();
    const active = document.activeElement;
    const box = active?.getBoundingClientRect();
    return {
      y: window.scrollY,
      focused: href === undefined || active?.getAttribute('href') === href,
      link: active?.matches('main a[href], main button, main summary') === true,
      heading: active?.tagName === 'H1',
      inBand: box !== undefined && box.top >= band.top - 1 && box.bottom <= band.bottom + 1,
      active: `${active?.tagName}:${active?.getAttribute('href') ?? active?.textContent}`,
    };
  }, href);

const cookReady = (page) =>
  page.waitForFunction(
    () => location.hash === '#/cook' && document.querySelectorAll('.dish-row').length > 0,
  );

const placeKept = (got, before, label) =>
  check(
    near(got.y, before.y) && got.inBand && got.focused && got.link,
    `${label}: the list stands where it stood (${got.y} for ${before.y}), the row in the band (${got.inBand}), its link focused (${got.active})`,
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
  await installBand(context);
  const page = await context.newPage();
  await open(page, server.origin, 'cook');
  await page.locator('.dish-group').first().waitFor();
  const desserts = page
    .locator('.dish-group', { has: page.locator('.dish-group-heading', { hasText: /^Dessert/ }) })
    .locator('a.dish-row');
  const row = desserts.first();
  const name = await row.locator('.entry-name').innerText();
  const before = await placeRow(row);
  check(before.y > 2000, `${label}: the dessert ${name} is far down the list (${before.y})`);
  const dishReady = () => page.getByRole('heading', { level: 1, name }).waitFor();

  // The browser's back.
  await row.click();
  await dishReady();
  await atTop(page, `${label}: the dish, reached forward`);
  await page.goBack();
  await cookReady(page);
  placeKept(await where(page, before.href), before, `${label}: browser back from ${name}`);

  // "Back to the list".
  await row.click();
  await dishReady();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await cookReady(page);
  placeKept(await where(page, before.href), before, `${label}: Back to the list from ${name}`);

  // Cooking step by step, back to the dish, then "Back to the list".
  await row.click();
  await dishReady();
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.waitForFunction(() => location.hash.endsWith('/cook'));
  await page.goBack();
  await dishReady();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await cookReady(page);
  placeKept(
    await where(page, before.href),
    before,
    `${label}: after cooking step by step, Back to the list from ${name}`,
  );

  // Back, forward, back again: each screen where it was left, the row focused on the list.
  await row.click();
  await dishReady();
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.goBack();
  await cookReady(page);
  placeKept(await where(page, before.href), before, `${label}: back from the dish scrolled to 300`);
  await page.goForward();
  await dishReady();
  const forward = await where(page, undefined);
  check(
    near(forward.y, 300) && forward.inBand && (forward.link || forward.heading),
    `${label}: forward again, the dish stands at 300 (${forward.y}), the focus on a control in the band (${forward.active})`,
  );
  await page.goBack();
  await cookReady(page);
  placeKept(await where(page, before.href), before, `${label}: back again after forward`);

  // Left by the navigation and back: the scroll as it was, the focus on a link in the band, not on
  // the heading thousands of pixels above.
  await page.locator('.app-nav').getByRole('link', { name: 'Notebook' }).click();
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  await atTop(page, `${label}: the Notebook from the navigation`);
  await page.goBack();
  await cookReady(page);
  const navBack = await where(page, undefined);
  check(
    near(navBack.y, before.y) && navBack.link && navBack.inBand,
    `${label}: back after leaving by the navigation, the scroll as it was (${navBack.y}), a link in the band focused (${navBack.active})`,
  );

  // A link opened in a new tab is not the link the screen was left by.
  await row.click();
  await dishReady();
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'Cook step by step' }).click({ modifiers: ['Control'] }),
  ]);
  await tab.close();
  // Scrolled to the end, the link out of view: had it been noted as the way out, the page would be
  // scrolled back to it and it would take the focus.
  const leftAt = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    return window.scrollY;
  });
  await page.goBack();
  await cookReady(page);
  await page.goForward();
  await dishReady();
  const stale = await where(page, '#/classic/' + before.href.split('/').pop() + '/cook');
  check(
    near(stale.y, leftAt) && !stale.focused,
    `${label}: forward to the dish after "Cook step by step" opened in a new tab: the scroll as it was (${stale.y} for ${leftAt}), the focus not on that link (${stale.active})`,
  );
  await page.goBack();
  await cookReady(page);

  // The control: Cook from the navigation (from another screen) starts at the top.
  await page.locator('.app-nav').getByRole('link', { name: 'Ratios' }).click();
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  await page.locator('.app-nav').getByRole('link', { name: 'Cook' }).click();
  await cookReady(page);
  await atTop(page, `${label}: Cook from the navigation, after the list was left far down`);

  // The Notebook's Components: a shipped component far down, opened and left by the browser's back.
  await page.locator('.app-nav').getByRole('link', { name: 'Notebook' }).click();
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  const component = page.locator('main a.row-link').last();
  const cName = await component.locator('.entry-name').innerText();
  const cBefore = await placeRow(component);
  await component.click();
  await page.getByRole('heading', { level: 1, name: cName }).waitFor();
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  placeKept(await where(page, cBefore.href), cBefore, `${label}: browser back from ${cName}`);

  // The list changed meanwhile: another tab chooses "Main course"; the dessert is gone.
  await page.locator('.app-nav').getByRole('link', { name: 'Cook' }).click();
  await cookReady(page);
  await placeRow(row);
  await row.click();
  await dishReady();
  const other = await context.newPage();
  await open(other, server.origin, 'cook');
  const fold = other.locator('details.dish-filter-fold');
  if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click();
  await other.getByLabel('Course', { exact: true }).selectOption({ label: 'Main course' });
  await other.close();
  await page.goBack();
  await cookReady(page);
  const changed = await where(page, undefined);
  const isRow = await page.evaluate(() => document.activeElement?.matches('a.dish-row') === true);
  check(
    isRow && changed.inBand,
    `${label}: the row gone (filter changed in another tab), a row in the band takes the focus (${changed.active})`,
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
