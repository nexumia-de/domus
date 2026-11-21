// Stage 1 of a run, on one device with nothing in it: the first start, adding, suggestions,
// ticking, a reload (real IndexedDB) and "Clear bought". Later stages go on with what is left.
import { add, tapAudit, ok, openApp, rowOf, rows, said, showAll } from './driver.mjs';

const text = (page, selector) => page.locator(selector).first().innerText();
const boughtTitle = (page, label) =>
  page.waitForFunction(
    (s) => [...document.querySelectorAll('.step-title')].some((h) => h.textContent === s),
    label,
  );

export async function listStage(run, { page }) {
  const { t, server } = run;
  const outside = [];
  page.on('request', (r) => {
    if (new URL(r.url()).origin !== server.origin) outside.push(r.url());
  });
  await openApp(page, server.origin);
  await page.waitForFunction(
    (s) => document.querySelector('.fr-sync')?.getAttribute('aria-label') === s,
    t.status.deviceOnly,
  );

  await ok(run, 'first start: the empty state', async () =>
    (await text(page, '.empty')).includes(t.list.empty),
  );
  await ok(run, 'frame: the header says the page, the body does not repeat it', async () => {
    const heading = await page.locator('h1').allInnerTexts();
    return (
      heading.length === 1 &&
      heading[0] === t.list.title &&
      (await page.locator('main h1, main h2').allInnerTexts()).every((s) => s !== t.list.title) &&
      (await page.locator('.app-header, .app-nav, .space-line').count()) === 0
    );
  });
  await ok(
    run,
    'frame: the header has no back arrow on the list; categories and settings are icons',
    async () => {
      const header = page.locator('.fr-header');
      return (
        (await header.getByRole('link', { name: t.nav.back, exact: true }).count()) === 0 &&
        (await header.getByRole('link', { name: t.nav.settings, exact: true }).count()) === 1 &&
        (await header.getByRole('link', { name: t.nav.categories, exact: true }).count()) === 1
      );
    },
  );
  await ok(
    run,
    `header sync icon: "${t.status.deviceOnly}" as name and tooltip, 44 px, no status line in the body`,
    async () => {
      const button = page.locator('.fr-sync');
      const box = await button.boundingBox();
      return (
        (await button.getAttribute('title')) === t.status.deviceOnly &&
        (await button.getAttribute('data-sync')) === 'local' &&
        (await button.locator('svg').count()) === 1 &&
        box.width >= 44 &&
        box.height >= 44 &&
        (await page.locator('.space-status').count()) === 0 &&
        (await page.locator('.fr-banner:not([hidden])').count()) === 0
      );
    },
  );
  await ok(run, 'header sync icon: a tap shows the details in a toast', async () => {
    await page.locator('.fr-sync').click();
    await said(page, t.status.deviceOnly);
    return true;
  });
  await ok(run, "first start: no request left the page's own origin", () => outside.length === 0);
  await ok(run, 'list: no small tap target, no overflow (empty)', async () => {
    const a = await tapAudit(page);
    if (a.small.length || a.overflow > 0) console.log('     ', JSON.stringify(a));
    return a.small.length === 0 && a.overflow <= 0;
  });

  // Adding: by the button (default priority), by Enter with "Now" and an amount.
  await add(page, t, 'Bread', { button: true });
  await add(page, t, 'Milk', { priority: 'now', amount: '2 l' });
  await ok(run, 'adding: both entries are on the list, the amount is shown', async () => {
    const list = await rows(page);
    return list.length === 2 && list.find((r) => r.name === 'Milk')?.amount === '2 l';
  });
  await ok(run, 'adding: a usual thing stands under its category, not under Other', async () => {
    const title = await rowOf(page, 'Milk').evaluate(
      (row) => row.closest('.entries').previousElementSibling.textContent,
    );
    const lang = await page.evaluate(() => document.documentElement.lang);
    return title === (lang === 'de' ? 'Milchprodukte & Eier' : 'Dairy & eggs');
  });
  // The frame: a window too low for the list still shows header and bottom edge; only the
  // content scrolls. Chromium only; says nothing about a browser whose `dvh` is off.
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.width, height: 320 });
  await ok(
    run,
    'frame: in a low window the header and the bottom bar stay, the page does not scroll',
    () =>
      page.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect();
        const main = document.querySelector('main');
        return (
          document.documentElement.scrollHeight === innerHeight &&
          box('.fr-header').top === 0 &&
          box('.app-dock').bottom === innerHeight &&
          main.scrollHeight > main.clientHeight
        );
      }),
  );
  await page.setViewportSize(size);
  await ok(run, 'adding: the Now section comes before Soon', async () => {
    const titles = await page.locator('.step-title').allInnerTexts();
    return titles.join('|') === `${t.priority.now}|${t.priority.soon}`;
  });
  await ok(run, 'adding: the fields are empty again and the add field has the focus', () =>
    page.evaluate(
      () =>
        document.activeElement === document.querySelector('.add-row input') &&
        document.activeElement.value === '',
    ),
  );
  await add(page, t, 'MILK');
  await ok(run, 'adding the same name in another spelling raises the one entry', async () => {
    const list = await rows(page);
    return (
      list.filter((r) => r.name.toLowerCase() === 'milk').length === 1 &&
      list.length === 2 &&
      (await text(page, '.fr-toast')).includes(t.list.raised('MILK'))
    );
  });

  // Ticking and a reload.
  await rowOf(page, 'Bread').locator('.tick').check();
  await ok(run, `ticking moves Bread to "${t.list.bought(1)}"`, async () => {
    await boughtTitle(page, t.list.bought(1));
    return (await rows(page)).find((r) => r.name === 'Bread')?.bought === true;
  });
  await page.reload();
  await page.waitForSelector('.entry');
  await ok(run, 'a reload keeps the entries, the amount and the tick', async () => {
    const list = await rows(page);
    return (
      list.length === 2 &&
      list.find((r) => r.name === 'Bread')?.bought === true &&
      list.find((r) => r.name === 'Milk')?.amount === '2 l'
    );
  });

  // Suggestions from earlier entries: Bread is bought, so "bre" offers it; tapping adds it.
  await page.getByLabel(t.list.addLabel, { exact: true }).fill('bre');
  await ok(run, 'typing shows a suggestion from an earlier entry', async () =>
    (await page.locator('.suggestion').allInnerTexts()).includes('Bread'),
  );
  await page.locator('.suggestion', { hasText: 'Bread' }).click();
  await said(page, t.list.added('Bread'));
  await ok(run, 'tapping a suggestion puts the thing on the list again (open)', async () =>
    (await rows(page)).some((r) => r.name === 'Bread' && !r.bought),
  );
  await ok(
    run,
    'after adding, the suggestions are gone and the field is empty',
    async () =>
      (await page.locator('.suggestion').count()) === 0 &&
      (await page.getByLabel(t.list.addLabel, { exact: true }).inputValue()) === '',
  );
}

/** Tick everything, clear the bought, Undo. Runs after the other stages. */
export async function clearStage(run, { page }) {
  const { t } = run;
  await page.goto(`${run.server.origin}/#/`);
  await page.waitForSelector('.entry');
  await showAll(page);
  // Each tick redraws the list, so the first open tick is looked up again every time.
  const open = page.locator('.entry:not(.entry-bought) .tick');
  // (A plain click: `check()` would look at a box that the redraw has already replaced.)
  for (let left = await open.count(); left > 0; left -= 1) {
    await open.first().click();
    await page.waitForFunction(
      (n) => document.querySelectorAll('.entry:not(.entry-bought)').length === n,
      left - 1,
    );
  }
  const total = (await rows(page)).length;
  await boughtTitle(page, t.list.bought(total));
  await ok(run, `all ticked: one section "${t.list.bought(total)}"`, async () =>
    (await rows(page)).every((r) => r.bought),
  );
  await page.getByRole('button', { name: t.list.clearBought, exact: true }).click();
  await said(page, t.list.cleared(total));
  await ok(
    run,
    'Clear bought empties the list and says how many',
    async () => (await rows(page)).length === 0 && (await page.locator('.empty').count()) === 1,
  );
  await page.locator('.fr-toast').getByRole('button', { name: t.list.undo, exact: true }).click();
  await page.waitForSelector('.entry');
  await ok(run, 'Undo brings the cleared entries back, still bought', async () => {
    const list = await rows(page);
    return list.length === total && list.every((r) => r.bought);
  });
}
