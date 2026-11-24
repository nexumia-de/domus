// The day a dish was cooked in a browser, at 360 x 720 in English and German, on an injected clock
// (`?e2e-now=`): two shipped dishes kept in the notebook; the gratin cooked step by step to the end
// on 2 Nov keeps that day (the status says so, the dish page and the Notebook's row show it); the
// other gets "Cooked today" on 24 Nov; "Clear the date" and "Cooked today" again, with the focus on
// the status line; Cook's order "Not cooked for long" puts the gratin first, as one list without
// groups (by name, the control, keeps the groups); a shipped dish cooked to its end keeps nothing.
// The day is the browser's calendar day in its time zone (`timezoneId`): just after midnight in
// Berlin and late in the evening in New York, where the UTC day differs. At 1000 px the Notebook's
// list beside the dish page follows "Cooked today" and "Clear the date" at once, the focus staying
// on the status line and the page not scrolling. With no dish marked, "Not cooked for long" says
// that the list is by name.
// What it does not prove: a real device's clock (the clock is injected), a screen reader, two tabs,
// the export (test/backup-cooked.test.ts).
import { check, watch } from './harness.mjs';
import { layout, listStore } from './editor-helpers.mjs';

const TEXT = {
  en: {
    keep: 'Keep in my notebook',
    cookStep: 'Cook step by step',
    kept: 'Marked as cooked on 2 Nov 2026.',
    line2: 'Last cooked: 2 Nov 2026',
    line24: 'Last cooked: 24 Nov 2026',
    none: 'Not marked as cooked yet.',
    today: 'Cooked today',
    clear: 'Clear the date',
    cleared: 'Date removed.',
    row2: 'cooked 2 Nov 2026',
    order: 'Order',
    notCooked: 'Not cooked for long',
    byName: 'By name',
    noDays: 'None of your dishes is marked as cooked yet, so the list is by name.',
    line25: 'Last cooked: 25 Nov 2026',
    row24: 'cooked 24 Nov 2026',
    zone: 'America/New_York',
  },
  de: {
    keep: 'In mein Notizbuch übernehmen',
    cookStep: 'Schritt für Schritt kochen',
    kept: 'Als gekocht am 02.11.2026 vermerkt.',
    line2: 'Zuletzt gekocht: 02.11.2026',
    line24: 'Zuletzt gekocht: 24.11.2026',
    none: 'Noch nicht als gekocht vermerkt.',
    today: 'Heute gekocht',
    clear: 'Datum entfernen',
    cleared: 'Datum entfernt.',
    row2: 'gekocht am 02.11.2026',
    order: 'Reihenfolge',
    notCooked: 'Lange nicht gekocht',
    byName: 'Nach Name',
    noDays: 'Noch keines deiner Gerichte ist als gekocht vermerkt, die Liste steht nach Name.',
    line25: 'Zuletzt gekocht: 25.11.2026',
    row24: 'gekocht am 24.11.2026',
    zone: 'Europe/Berlin',
  },
};

const at = (origin, now, hash) => `${origin}/?no-sw&e2e-store&e2e-now=${now}#/${hash}`;
const NOV2 = '2026-11-02T18:00:00Z';
const NOV24 = '2026-11-24T18:00:00Z';

/** Opens a page fresh on a clock and waits for a heading of level 1. */
const go = async (page, url) => {
  await page.goto('about:blank');
  await page.goto(url);
  await page.getByRole('heading', { level: 1 }).waitFor();
};

/** Keeps a shipped dish in the notebook and gives the id and name of the new own dish. */
const keep = async (page, origin, id, t) => {
  await go(page, at(origin, NOV2, `classic/${id}`));
  await page.locator('.classic-copy').getByRole('button', { name: t.keep }).click();
  await page.waitForURL(/#\/dishes\/u-/);
  // The shipped page stands until the own one is drawn; only the own one has the day's line.
  await page.locator('.dish-card .dish-cooked-line').waitFor();
  const own = decodeURIComponent(new URL(page.url()).hash.split('/')[2] ?? '');
  const name = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
  return { own, name };
};

/** Cooks the page's dish to its end with Next and Finish. */
const cookToEnd = async (page) => {
  const next = page.locator('.cook-next');
  await next.waitFor();
  for (let i = 0; i < 80 && (await next.isVisible()); i++) await next.click();
};

export const dishCooked = async (browser, server) => {
  for (const lang of ['en', 'de']) {
    const t = TEXT[lang];
    const label = `360px day a dish was cooked (${lang})`;
    const context = await browser.newContext({
      viewport: { width: 360, height: 720 },
      locale: lang === 'de' ? 'de-DE' : 'en-US',
      timezoneId: t.zone,
      serviceWorkers: 'block',
    });
    const problems = watch(context, server.origin);
    const page = await context.newPage();
    const origin = server.origin;

    // No dish marked yet: "Not cooked for long" is by name and says so (the state on the day it ships).
    await go(page, at(origin, NOV2, 'cook'));
    await page.locator('.dish-rows .entry-name').first().waitFor();
    check(
      (await page.locator('.cook-no-days').count()) === 0,
      `${label}: by name no sentence about the days (control)`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.notCooked });
    await page.locator('.cook-no-days').waitFor();
    check(
      (await page.locator('.cook-no-days').innerText()).trim() === t.noDays,
      `${label}: with no dish marked the order says ${t.noDays}`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.byName });

    // Control first: a shipped dish cooked to its end keeps nothing.
    await go(page, at(origin, NOV2, 'classic/pot-au-feu/cook'));
    await cookToEnd(page);
    await page.locator('.classic-finish').waitFor();
    check(
      (await listStore(page, 'cooked')).length === 0,
      `${label}: a shipped dish cooked to its end keeps no day`,
    );

    const gratin = await keep(page, origin, 'gratin-dauphinois', t);
    const potatoes = await keep(page, origin, 'baked-potatoes-cheese', t);
    check(
      (await page.locator('.dish-cooked-line').innerText()).trim() === t.none,
      `${label}: a kept dish says no day is kept (${await page.locator('.dish-cooked-line').innerText()})`,
    );

    // The gratin cooked step by step on 2 Nov.
    await go(page, at(origin, NOV2, `dishes/${gratin.own}/cook`));
    await cookToEnd(page);
    const status = page.locator('.cook-body [role="status"]');
    await page.waitForFunction(
      (want) => document.querySelector('.cook-body [role="status"]')?.textContent === want,
      t.kept,
    );
    check(
      (await status.innerText()).trim() === t.kept,
      `${label}: the end of cooking says ${t.kept}`,
    );
    const stored = await listStore(page, 'cooked');
    check(
      stored.length === 1 && stored[0].date === '2026-11-02' && stored[0].dish === gratin.own,
      `${label}: one record, the family and the day (${JSON.stringify(stored)})`,
    );
    // Opening the screen again at its end (the step is kept while the page lives) writes nothing:
    // a write would stamp the row 1 ms later.
    const stamp = () =>
      page.evaluate(async () => {
        const opened = await globalThis.__culinaStore;
        return (await opened.store.listRows('cooked')).rows.map((r) => r.updatedAt).join();
      });
    const before = await stamp();
    await page.evaluate((id) => {
      window.location.hash = `#/dishes/${id}`;
    }, gratin.own);
    await page.locator('.dish-card .dish-cooked-line').waitFor();
    await page.evaluate((id) => {
      window.location.hash = `#/dishes/${id}/cook`;
    }, gratin.own);
    await page.locator('.cook-body h2').waitFor();
    check(
      (await page.locator('.cook-next').isHidden()) && (await stamp()) === before,
      `${label}: opening the screen at its end writes nothing (${before})`,
    );

    // The dish page shows it; "Clear the date", "Cooked today", focus on the status line.
    await go(page, at(origin, NOV24, `dishes/${gratin.own}`));
    const line = page.locator('.dish-card .dish-cooked-line');
    await line.waitFor();
    check((await line.innerText()).trim() === t.line2, `${label}: the dish page says ${t.line2}`);
    await layout(page, `${label}, dish page`);
    await page.getByRole('button', { name: t.clear }).click();
    await page.waitForFunction(
      (want) => document.querySelector('.dish-cooked-line')?.textContent === want,
      t.none,
    );
    check(
      await page.evaluate(
        (want) =>
          document.activeElement?.classList.contains('dish-cooked-status') &&
          document.activeElement.textContent === want,
        t.cleared,
      ),
      `${label}: after Clear the status line has the focus and says ${t.cleared}`,
    );
    check(
      (await page.getByRole('button', { name: t.clear }).count()) === 0,
      `${label}: with no day kept there is nothing to clear`,
    );
    await page.getByRole('button', { name: t.today }).click();
    await page.waitForFunction(
      (want) => document.querySelector('.dish-cooked-line')?.textContent === want,
      t.line24,
    );
    check(true, `${label}: Cooked today keeps the clock's day (${t.line24})`);
    // Back to the 2nd, by cooking it on that day, for the order below.
    await go(page, at(origin, NOV2, `dishes/${gratin.own}/cook`));
    await cookToEnd(page);
    await page.waitForFunction(
      (want) => document.querySelector('.cook-body [role="status"]')?.textContent === want,
      t.kept,
    );
    // The potatoes: Cooked today on the 24th.
    await go(page, at(origin, NOV24, `dishes/${potatoes.own}`));
    await page.getByRole('button', { name: t.today }).click();
    await page.waitForFunction(
      (want) => document.querySelector('.dish-cooked-line')?.textContent === want,
      t.line24,
    );

    // The Notebook's Dishes say the day in the row.
    await go(page, at(origin, NOV24, 'dishes'));
    const gratinRow = page.locator(`a.notebook-row[href="#/dishes/${gratin.own}"] .entry-meta`);
    await gratinRow.waitFor();
    check(
      (await gratinRow.innerText()).includes(t.row2),
      `${label}: the Notebook's row says ${t.row2} (${await gratinRow.innerText()})`,
    );

    // Cook: by name in groups (the control), "Not cooked for long" one list, the gratin first.
    await go(page, at(origin, NOV24, 'cook'));
    await page.locator('.dish-group').first().waitFor();
    check(
      (await page.locator('.dish-group').count()) > 1,
      `${label}: by name the list stands in groups`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.notCooked });
    await page.waitForFunction(() => document.querySelectorAll('.dish-group').length === 0);
    const names = await page.locator('.dish-rows .entry-name').allInnerTexts();
    check(
      names[0] === gratin.name && names[1] === potatoes.name,
      `${label}: "${t.notCooked}" puts the earliest day first (${names.slice(0, 3).join(' | ')})`,
    );
    const firstMeta = await page.locator('.dish-rows .entry-meta').first().innerText();
    check(firstMeta.includes(t.row2), `${label}: the first row says ${t.row2} (${firstMeta})`);
    check(
      names.length > 100,
      `${label}: the shipped dishes are still listed, after, by name (${names.length})`,
    );
    await layout(page, `${label}, Cook`);
    // Kept: the order is still chosen after a reload.
    await go(page, at(origin, NOV24, 'cook'));
    await page.locator('.dish-rows .entry-name').first().waitFor();
    check(
      (await page.getByLabel(t.order).inputValue()) === 'not-cooked',
      `${label}: the order is kept on this device`,
    );
    check(
      (await page.locator('.cook-no-days').count()) === 0,
      `${label}: with a dish marked the sentence is gone`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.byName });
    await page.locator('.dish-group').first().waitFor();
    check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
    await context.close();
  }
  await beside(browser, server);
  await midnight(browser, server);
};

/** From 720 px the Notebook's list stands beside the dish page: its row follows set and clear. */
const beside = async (browser, server) => {
  const t = TEXT.en;
  const label = '1000px day a dish was cooked, the list beside';
  const context = await browser.newContext({
    viewport: { width: 1000, height: 700 },
    locale: 'en-US',
    timezoneId: 'UTC',
    serviceWorkers: 'block',
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const origin = server.origin;
  await keep(page, origin, 'baked-potatoes-cheese', t);
  const gratin = await keep(page, origin, 'gratin-dauphinois', t);
  await go(page, at(origin, NOV24, `dishes/${gratin.own}`));
  const row = page.locator(`.dishes-pane a.notebook-row[href="#/dishes/${gratin.own}"]`);
  await row.waitFor();
  await page.locator('.dish-card .dish-cooked-line').waitFor();
  check(
    !(await row.innerText()).includes('cooked'),
    `${label}: before, the row says no day (${await row.innerText()})`,
  );
  const scroll = () =>
    page.evaluate(() => [window.scrollY, document.querySelector('.dishes-pane')?.scrollTop]);
  const before = await scroll();
  await page.getByRole('button', { name: t.today }).click();
  await page.waitForFunction(
    (href) =>
      document
        .querySelector(`.dishes-pane a[href="${href}"] .entry-meta`)
        ?.textContent?.includes('cooked 24 Nov 2026'),
    `#/dishes/${gratin.own}`,
  );
  check(true, `${label}: after Cooked today the row says ${t.row24} at once`);
  check(
    await page.evaluate(() => document.activeElement?.classList.contains('dish-cooked-status')),
    `${label}: the focus stays on the status line`,
  );
  check(
    JSON.stringify(await scroll()) === JSON.stringify(before),
    `${label}: nothing scrolled (${JSON.stringify(before)})`,
  );
  await page.getByRole('button', { name: t.clear }).click();
  await page.waitForFunction(
    (href) =>
      !(document.querySelector(`.dishes-pane a[href="${href}"]`)?.textContent ?? 'cooked').includes(
        'cooked',
      ),
    `#/dishes/${gratin.own}`,
  );
  check(true, `${label}: after Clear the date the row says no day at once`);
  check(
    await page.evaluate(
      (want) =>
        document.activeElement?.classList.contains('dish-cooked-status') &&
        document.activeElement.textContent === want,
      t.cleared,
    ),
    `${label}: the focus stays on the status line, which says ${t.cleared}`,
  );
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};

/** The day is the browser's calendar day: around midnight the UTC day is another one. */
const midnight = async (browser, server) => {
  for (const [zone, now, lang, want] of [
    ['Europe/Berlin', '2026-11-24T23:30:00Z', 'de', TEXT.de.line25],
    ['America/New_York', '2026-11-25T04:30:00Z', 'en', TEXT.en.line24],
  ]) {
    const t = TEXT[lang];
    const label = `360px day a dish was cooked, ${zone} at ${now}`;
    const context = await browser.newContext({
      viewport: { width: 360, height: 720 },
      locale: lang === 'de' ? 'de-DE' : 'en-US',
      timezoneId: zone,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    const origin = server.origin;
    const dish = await keep(page, origin, 'gratin-dauphinois', t);
    await go(page, at(origin, now, `dishes/${dish.own}`));
    await page.locator('.dish-card .dish-cooked-line').waitFor();
    await page.getByRole('button', { name: t.today }).click();
    await page.waitForFunction(
      (text) => document.querySelector('.dish-cooked-line')?.textContent !== text,
      t.none,
    );
    const shown = (await page.locator('.dish-cooked-line').innerText()).trim();
    const stored = (await listStore(page, 'cooked'))[0]?.date;
    check(
      shown === want && stored === (lang === 'de' ? '2026-11-25' : '2026-11-24'),
      `${label}: Cooked today keeps the local day (${shown}, stored ${stored})`,
    );
    await context.close();
  }
};
