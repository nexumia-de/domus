// Favourites in a browser, at 360 x 720 in English and German (docs/behaviour.md#favourites): the
// star on the page of a shipped dish (a frame included) and of an own dish, 44 px, named the same in
// both states, pressed state, the status line says what was done and the focus stays on the star; a
// copy kept from a marked shipped dish is not marked; the marks survive a reload; "Favourites only"
// and the order "Favourites first" of Cook's one list; a row says it is a favourite; taking the
// mark back removes the record; with no favourite the order says it is by name.
// What it does not prove: a real device, a screen reader, two tabs, the export (test/backup-
// favourites.test.ts), the order of a long list on a phone's scroll.
import { check, watch } from './harness.mjs';
import { layout, listStore } from './editor-helpers.mjs';

const TEXT = {
  en: {
    keep: 'Keep in my notebook',
    label: 'Favourite',
    add: 'Add to favourites',
    remove: 'Remove from favourites',
    added: 'Added to favourites.',
    removed: 'Removed from favourites.',
    only: 'Favourites only',
    order: 'Order',
    first: 'Favourites first',
    byName: 'By name',
    none: 'No dish is marked as a favourite yet, so the list is by name.',
    row: 'Favourite',
  },
  de: {
    keep: 'In mein Notizbuch übernehmen',
    label: 'Favorit',
    add: 'Zu den Favoriten',
    remove: 'Aus den Favoriten entfernen',
    added: 'Zu den Favoriten hinzugefügt.',
    removed: 'Aus den Favoriten entfernt.',
    only: 'Nur Favoriten',
    order: 'Reihenfolge',
    first: 'Favoriten zuerst',
    byName: 'Nach Name',
    none: 'Noch kein Gericht ist als Favorit markiert, die Liste steht nach Name.',
    row: 'Favorit',
  },
};

const FRAME = 'tacos';
const SHIPPED = 'gratin-dauphinois';

const go = async (page, origin, hash) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};

const openFilter = async (page) => {
  const fold = page.locator('details.dish-filter-fold');
  if ((await fold.count()) > 0 && !(await fold.evaluate((d) => d.open)))
    await fold.locator('summary').click();
};

const rowCount = (page) => page.locator('.dish-rows .entry-name').count();

export const dishFavourite = async (browser, server) => {
  for (const lang of ['en', 'de']) {
    const t = TEXT[lang];
    const label = `360px favourites (${lang})`;
    const context = await browser.newContext({
      viewport: { width: 360, height: 720 },
      locale: lang === 'de' ? 'de-DE' : 'en-US',
      serviceWorkers: 'block',
    });
    const problems = watch(context, server.origin);
    const page = await context.newPage();
    const origin = server.origin;
    const star = () => page.getByRole('button', { name: t.label, exact: true });
    const said = (text) =>
      page.waitForFunction(
        (want) => document.querySelector('.favourite-status')?.textContent === want,
        text,
      );

    // Cook with no favourite: the order says it is by name.
    await go(page, origin, 'cook');
    await page.locator('.dish-rows .entry-name').first().waitFor();
    check(
      (await page.locator('.cook-no-favourites').count()) === 0,
      `${label}: by name no sentence about favourites (control)`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.first });
    await page.locator('.cook-no-favourites').waitFor();
    check(
      (await page.locator('.cook-no-favourites').innerText()).trim() === t.none,
      `${label}: with no favourite the order says ${t.none}`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.byName });

    // A shipped dish: the star, its states, the status line, the focus.
    await go(page, origin, `classic/${SHIPPED}`);
    await star().waitFor();
    const box = await star().boundingBox();
    check(
      box !== null && box.width >= 44 && box.height >= 44,
      `${label}: the star is at least 44 x 44 (${JSON.stringify(box)})`,
    );
    check(
      (await star().getAttribute('aria-pressed')) === 'false' &&
        (await star().getAttribute('title')) === t.add,
      `${label}: not marked, the tooltip says ${t.add}`,
    );
    await layout(page, `${label}, shipped dish page`);
    await star().click();
    await said(t.added);
    check(
      (await star().getAttribute('aria-pressed')) === 'true' &&
        (await star().getAttribute('title')) === t.remove &&
        (await star().evaluate((n) => n === document.activeElement)),
      `${label}: marked, the tooltip says ${t.remove}, the focus stays on the star`,
    );
    let stored = await listStore(page, 'favourites');
    check(
      stored.length === 1 && stored[0].origin === 'shipped' && stored[0].dish === SHIPPED,
      `${label}: one record, shipped, ${SHIPPED} (${JSON.stringify(stored)})`,
    );

    // A frame is a dish like the others.
    await go(page, origin, `classic/${FRAME}`);
    await star().click();
    await said(t.added);
    check(
      (await listStore(page, 'favourites')).length === 2,
      `${label}: a frame (${FRAME}) is marked too`,
    );

    // A copy kept from a marked shipped dish is an own dish and is not marked.
    await go(page, origin, `classic/${SHIPPED}`);
    await page.locator('.classic-copy').getByRole('button', { name: t.keep }).click();
    await page.waitForURL(/#\/dishes\/u-/);
    await star().waitFor();
    const own = decodeURIComponent(new URL(page.url()).hash.split('/')[2] ?? '');
    check(
      (await star().getAttribute('aria-pressed')) === 'false',
      `${label}: a copy kept from a marked shipped dish is not marked`,
    );
    await star().click();
    await said(t.added);
    stored = await listStore(page, 'favourites');
    check(
      stored.length === 3 && stored.some((r) => r.origin === 'own' && r.dish === own),
      `${label}: the own dish is marked by its family (${JSON.stringify(stored)})`,
    );
    await layout(page, `${label}, own dish page`);

    // Kept over a reload.
    await go(page, origin, `dishes/${own}`);
    await star().waitFor();
    check(
      (await star().getAttribute('aria-pressed')) === 'true',
      `${label}: the mark of the own dish is still there after a reload`,
    );

    // Cook: "Favourites only" and "Favourites first".
    await go(page, origin, 'cook');
    await page.locator('.dish-rows .entry-name').first().waitFor();
    const total = await rowCount(page);
    await openFilter(page);
    await page.getByLabel(t.only, { exact: true }).check();
    await page.waitForFunction(
      (n) => document.querySelectorAll('.dish-rows .entry-name').length < n,
      total,
    );
    const only = await rowCount(page);
    check(only === 3, `${label}: "${t.only}" lists the three favourites (${only} of ${total})`);
    const metas = await page.locator('.dish-rows .entry-meta').allInnerTexts();
    check(
      metas.length === 3 && metas.every((m) => m.includes(t.row)),
      `${label}: every row says ${t.row} (${metas.join(' | ')})`,
    );
    await layout(page, `${label}, Cook, favourites only`);
    await page.getByLabel(t.only, { exact: true }).uncheck();
    await page.waitForFunction(
      (n) => document.querySelectorAll('.dish-rows .entry-name').length === n,
      total,
    );
    await page.getByLabel(t.order).selectOption({ label: t.first });
    await page.waitForFunction(() => document.querySelectorAll('.dish-group').length === 0);
    const metaOfFirst = await page
      .locator('.dish-rows .dish-row')
      .evaluateAll((rows) =>
        rows.slice(0, 4).map((r) => r.querySelector('.entry-meta')?.textContent ?? ''),
      );
    check(
      metaOfFirst.slice(0, 3).every((m) => m.includes(t.row)) && !metaOfFirst[3].includes(t.row),
      `${label}: "${t.first}" puts the three favourites first (${metaOfFirst.join(' | ')})`,
    );
    await layout(page, `${label}, Cook, favourites first`);
    await go(page, origin, 'cook');
    await page.locator('.dish-rows .entry-name').first().waitFor();
    check(
      (await page.getByLabel(t.order).inputValue()) === 'favourites',
      `${label}: the order is kept on this device`,
    );
    await page.getByLabel(t.order).selectOption({ label: t.byName });

    // Taking the mark back removes it from the live records.
    await go(page, origin, `classic/${SHIPPED}`);
    await star().click();
    await said(t.removed);
    check(
      (await star().getAttribute('aria-pressed')) === 'false' &&
        (await listStore(page, 'favourites')).length === 2,
      `${label}: the mark is taken back, two records stay`,
    );
    check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
    await context.close();
  }
};
