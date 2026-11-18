// Stock in a browser: tick several (an own ingredient, a catalogue ingredient, a component) without
// leaving the screen, untick with Undo, always there, optional detail, use up part of an amount,
// reload keeps it all, remaining days from a fixed date (`?e2e-now=`), a field of another app
// survives an edit, offline, the navigation at 320 and 360 px, targets, no console error.
import { check, watch } from './harness.mjs';
import { layout, listStore, putStore } from './editor-helpers.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { rowNamed } from './catalogue-helpers.mjs';
import { seed } from './seed.mjs';
import { controlled } from './smoke.mjs';

const NOW = '2026-11-18T08:00:00Z';
const EGG = rowNamed('Egg, whole, fresh');
const label = '360px stock';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const openAt = async (page, origin, hash, now = NOW) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store&e2e-now=${now}#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};
const noFieldFocused = (page) =>
  page.evaluate(
    () => !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? ''),
  );
const tickBox = (page, name) => page.getByRole('checkbox', { name: new RegExp(`^${name}`) });
/** Waits until the box is ticked (or not): a tick is written first and then drawn. */
const isTicked = (page, name, checked = true) =>
  page.getByRole('checkbox', { name: new RegExp(`^${name}`), checked }).waitFor();
const rowNames = (page) => page.locator('.stock-rows .stock-link .entry-name').allTextContents();
const rowText = async (page, name) =>
  (
    await page
      .locator('.stock-rows li')
      .filter({ has: page.locator('.entry-name', { hasText: new RegExp(`^${name}$`) }) })
      .locator('.stock-link')
      .innerText()
  ).replace(/\s+/g, ' ');
const stockRows = (page) => listStore(page, 'stock');
const byRef = (rows, id) => rows.filter((r) => r.ref.id === id);

const navigation = async (browser, origin, width) => {
  const context = await browser.newContext({ viewport: { width, height: 640 } });
  const page = await context.newPage();
  await openAt(page, origin, 'stock');
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('.nav-link')].map((a) => {
      const text = a.querySelector('.nav-label');
      const box = a.getBoundingClientRect();
      return {
        name: text.textContent,
        w: box.width,
        h: box.height,
        lines: Math.round(
          text.getBoundingClientRect().height /
            parseFloat(getComputedStyle(text).lineHeight || '16'),
        ),
        clipped: text.scrollWidth > text.clientWidth,
        right: box.right,
      };
    }),
  );
  check(
    links.length === 5 &&
      links.map((l) => l.name).join() === 'Ratios,Components,Dishes,Stock,Settings',
    `${width}px: the navigation has five entries, Stock between Dishes and Settings`,
  );
  check(
    links.every((l) => l.w >= 44 && l.h >= 44 && !l.clipped && l.right <= width + 0.5),
    `${width}px: bottom navigation fits with targets of 44 px and no clipped label ${JSON.stringify(links.map((l) => [l.name, Math.round(l.w), Math.round(l.h)]))}`,
  );
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll('.nav-label')].map((n) => n.getBoundingClientRect().height),
  );
  check(
    new Set(heights).size === 1,
    `${width}px: every navigation label is on one line (${heights})`,
  );
  await context.close();
};

const ticking = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await seed(page, origin);
  await openAt(page, origin, 'stock');
  check(
    (await page.locator('.empty').innerText()).startsWith('Nothing is ticked yet'),
    `${label}: an empty stock invites ticking`,
  );
  await layout(page, `${label} (empty list)`);

  await page.getByRole('link', { name: 'Tick what is there' }).click();
  await page.getByRole('heading', { level: 1, name: 'Tick what is there' }).waitFor();
  check(page.url().endsWith('#/stock/add'), `${label}: the quick entry is #/stock/add`);
  check(await noFieldFocused(page), `${label}: no field is focused when the quick entry opens`);
  await layout(page, `${label} (quick entry)`);

  // Several ticks in a row without leaving the screen: two own ingredients and a component.
  await tickBox(page, 'Carrot').click();
  await isTicked(page, 'Carrot');
  await tickBox(page, 'Onion').click();
  await isTicked(page, 'Onion');
  await tickBox(page, 'Example: Vegetable stock').click();
  await isTicked(page, 'Example: Vegetable stock');
  check(
    page.url().endsWith('#/stock/add') &&
      (await page.locator('.stock-tick[aria-checked="true"]').count()) === 3,
    `${label}: three ticks in a row, still on the same screen, each shown with a check mark`,
  );
  const marks = await page
    .locator('.stock-tick[aria-checked="true"] .stock-mark')
    .allTextContents();
  check(
    marks.length === 3 && marks.every((m) => m === '✓'),
    `${label}: a tick is a shape, not only a colour`,
  );
  let rows = await stockRows(page);
  const onion = byRef(rows, 'onion')[0];
  const stockComponent = rows.find((r) => r.ref.kind === 'component');
  check(
    rows.length === 3 &&
      same(Object.keys(onion).sort(), ['id', 'ref']) &&
      same(onion.ref, { kind: 'ingredient', id: 'onion' }) &&
      stockComponent?.ref.id === 'example-vegetable-stock',
    `${label}: a tick stores only id and ref; a component is stock with ref kind component`,
  );

  // A catalogue ingredient: search, pick; it is copied into the notebook, ticked and undoable.
  await page.getByLabel('Search your notebook to tick').fill('egg, whole, fresh');
  await page
    .locator('.picker-catalogue')
    .getByRole('button', { name: new RegExp(`^${EGG.name} by `) })
    .first()
    .click();
  await page.getByText(/is in stock\.$/).waitFor();
  const egg = byRef(await stockRows(page), EGG.id)[0];
  const adopted = (await listStore(page, 'ingredients')).find((i) => i.id === EGG.id);
  check(
    egg !== undefined && same(Object.keys(egg).sort(), ['id', 'ref']) && adopted?.name === EGG.name,
    `${label}: a catalogue ingredient is adopted into the notebook and ticked (${adopted?.name})`,
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction(
    async () => (await (await globalThis.__culinaStore).store.list('stock')).records.length === 3,
  );
  check(true, `${label}: Undo takes the catalogue tick away again`);
  await page.getByLabel('Search your notebook to tick').fill('');

  // Untick with the toast and Undo.
  await tickBox(page, 'Onion').click();
  await page.getByText('Onion is no longer in stock.').waitFor();
  await isTicked(page, 'Onion', false);
  check(
    byRef(await stockRows(page), 'onion').length === 0,
    `${label}: unticking removes the item at once`,
  );
  await layout(page, `${label} (toast)`);
  await page.getByRole('button', { name: 'Undo' }).click();
  await isTicked(page, 'Onion');
  check(
    byRef(await stockRows(page), 'onion').length === 1 &&
      (await tickBox(page, 'Onion').getAttribute('aria-checked')) === 'true',
    `${label}: Undo puts the tick back`,
  );

  // Always there.
  const always = page.getByRole('button', { name: 'Always there: Carrot' });
  await always.click();
  await page.waitForFunction(() => document.querySelector('.stock-always[aria-pressed="true"]'));
  rows = await stockRows(page);
  check(
    byRef(rows, 'carrot')[0].always === true &&
      (await page
        .getByRole('button', { name: 'Always there: Carrot' })
        .getAttribute('aria-pressed')) === 'true',
    `${label}: always there is marked per item and stored`,
  );
  await layout(page, `${label} (ticked, always there)`);
  await context.close();
  return problems;
};

const detail = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await seed(page, origin);
  await openAt(page, origin, 'stock/add');
  await tickBox(page, 'Onion').click();
  await isTicked(page, 'Onion');
  await tickBox(page, 'Carrot').click();
  await isTicked(page, 'Carrot');
  await page.getByRole('button', { name: 'Always there: Carrot' }).click();
  await tickBox(page, 'Salt').click();
  await isTicked(page, 'Salt');
  await page.waitForFunction(
    async () => (await (await globalThis.__culinaStore).store.list('stock')).records.length === 3,
  );

  await openAt(page, origin, 'stock');
  check(
    same(await rowNames(page), ['Carrot', 'Onion', 'Salt']) &&
      (await rowText(page, 'Carrot')) === 'Carrot always there',
    `${label}: the list is by name, an item shows only what was entered`,
  );
  await layout(page, `${label} (list)`);

  // Detail of the onion.
  await page.getByRole('link', { name: /^Onion/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Onion in stock' }).waitFor();
  check(await noFieldFocused(page), `${label}: no field is focused when the detail opens`);
  await page.getByLabel('Amount', { exact: true }).fill('500');
  await page.getByLabel('State').selectOption('raw');
  await page.getByLabel('Date prepared').fill('2026-11-17');
  await page.getByLabel('Use by').fill('2026-11-20');
  await layout(page, `${label} (detail)`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Stock' }).waitFor();
  let onion = byRef(await stockRows(page), 'onion')[0];
  check(
    same(onion.amount, { value: 500, unit: 'g' }) &&
      onion.state === 'raw' &&
      onion.preparedOn === '2026-11-17' &&
      onion.useBy === '2026-11-20',
    `${label}: amount, unit, state, date prepared and use by are stored`,
  );
  check(
    (await rowText(page, 'Onion')) === 'Onion 500 g · raw 2 days left',
    `${label}: the row shows the detail and the days left in words (${await rowText(page, 'Onion')})`,
  );
  check(
    (await rowNames(page))[0] === 'Onion',
    `${label}: the item with a use-by date comes first, then the others by name`,
  );
  const todayButton = async () => {
    await page.getByRole('link', { name: /^Salt/ }).click();
    await page.getByRole('heading', { level: 1, name: 'Salt in stock' }).waitFor();
    await page.getByRole('button', { name: 'Today' }).click();
    return page.getByLabel('Date prepared').inputValue();
  };
  check(
    (await todayButton()) === '2026-11-18',
    `${label}: the date prepared offers today from the injected clock`,
  );
  await page.goBack();

  // Use up part of an amount.
  await page.getByRole('link', { name: /^Onion/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Onion in stock' }).waitFor();
  await page.getByLabel('Amount used').fill('120');
  await page.getByRole('button', { name: 'Subtract' }).click();
  await page.getByText('380 g left.').waitFor();
  onion = byRef(await stockRows(page), 'onion')[0];
  check(
    same(onion.amount, { value: 380, unit: 'g' }) &&
      (await page.getByLabel('Amount', { exact: true }).inputValue()) === '380',
    `${label}: using 120 g of 500 g leaves 380 g, stored at once`,
  );
  await page.getByLabel('Amount used').fill('0.18');
  await page.getByLabel('Unit', { exact: true }).last().selectOption('kg');
  await page.getByRole('button', { name: 'Subtract' }).click();
  await page.getByText('200 g left.').waitFor();
  check(
    same(byRef(await stockRows(page), 'onion')[0].amount, { value: 200, unit: 'g' }),
    `${label}: an amount in another unit is subtracted in the unit in stock`,
  );
  await page.getByLabel('Amount used').fill('1');
  await page.getByLabel('Unit', { exact: true }).last().selectOption('kg');
  await page.getByRole('button', { name: 'Subtract' }).click();
  await page.getByText('Used up Onion.').waitFor();
  check(
    byRef(await stockRows(page), 'onion').length === 0 && page.url().endsWith('#/stock'),
    `${label}: using all of it removes the item with a toast`,
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('link', { name: /^Onion/ }).waitFor();
  check(
    same(byRef(await stockRows(page), 'onion')[0].amount, { value: 200, unit: 'g' }),
    `${label}: Undo brings the item back with its amount`,
  );

  // Reload keeps it all.
  const before = await stockRows(page);
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Stock' }).waitFor();
  check(
    same(await stockRows(page), before) && (await rowNames(page)).length === 3,
    `${label}: a reload keeps every item`,
  );

  // Remove from the list with Undo.
  await page.getByRole('button', { name: 'Remove Salt from stock' }).click();
  await page.getByText('Removed Salt from stock.').waitFor();
  check((await rowNames(page)).length === 2, `${label}: Remove acts at once`);
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('link', { name: /^Salt/ }).waitFor();
  check((await rowNames(page)).length === 3, `${label}: Undo puts the removed item back`);
  await context.close();
  return problems;
};

const remaining = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await seed(page, origin);
  await openAt(page, origin, 'stock');
  const item = (id, ref, extra) => ({ id, ref: { kind: 'ingredient', id: ref }, ...extra });
  for (const record of [
    item('u-a', 'carrot'),
    item('u-b', 'onion', { useBy: '2026-11-20' }),
    item('u-c', 'butter', { useBy: '2026-11-25' }),
    item('u-d', 'salt', { always: true }),
    item('u-e', 'flour', { useBy: '2026-11-18' }),
  ]) {
    await putStore(page, 'stock', record);
  }
  const texts = async (now) => {
    await openAt(page, origin, 'stock', now);
    const out = {};
    for (const li of await page.locator('.stock-rows li').all()) {
      out[await li.locator('.entry-name').innerText()] = (await li
        .locator('.stock-remaining')
        .count())
        ? await li.locator('.stock-remaining').innerText()
        : '';
    }
    return out;
  };
  let at = await texts('2026-11-18T08:00:00Z');
  check(
    same(at, {
      Flour: 'use by today',
      Onion: '2 days left',
      Butter: '7 days left',
      Carrot: '',
      Salt: '',
    }) && same(await rowNames(page), ['Flour', 'Onion', 'Butter', 'Carrot', 'Salt']),
    `${label}: on 2026-11-18 ${JSON.stringify(at)}, nearest use-by first, then by name`,
  );
  at = await texts('2026-11-19T08:00:00Z');
  check(
    at.Flour === 'past use by' && at.Onion === '1 day left',
    `${label}: on 2026-11-19 ${JSON.stringify(at)}`,
  );
  at = await texts('2026-11-21T08:00:00Z');
  check(
    at.Flour === 'past use by' && at.Onion === 'past use by' && at.Butter === '4 days left',
    `${label}: on 2026-11-21 ${JSON.stringify(at)}`,
  );
  const fg = await page.evaluate(() =>
    [...document.querySelectorAll('.stock-remaining')].map((n) => getComputedStyle(n).color),
  );
  const meta = await page.evaluate(
    () => getComputedStyle(document.querySelector('.entry-meta')).color,
  );
  check(
    new Set(fg).size === 1 && fg[0] === meta,
    `${label}: past, today and future use the same text colour; the words carry the information`,
  );
  await layout(page, `${label} (days left)`);

  // Fields of another app survive an edit.
  await putStore(page, 'stock', {
    id: 'u-x',
    ref: { kind: 'ingredient', id: 'celery' },
    'x-emptio': { boughtOn: '2026-11-10', shop: 'Market' },
  });
  await openAt(page, origin, 'stock/u-x/edit');
  await page.getByLabel('Note').fill('crisper drawer');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Stock' }).waitFor();
  const x = byRef(await stockRows(page), 'celery')[0];
  check(
    same(x['x-emptio'], { boughtOn: '2026-11-10', shop: 'Market' }) && x.note === 'crisper drawer',
    `${label}: a field of another app (x-emptio) survives an edit`,
  );
  await context.close();
  return problems;
};

const offline = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?e2e-store#/stock/add`);
  await page.getByRole('heading', { level: 1, name: 'Tick what is there' }).waitFor();
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Tick what is there' }).waitFor();
  await page.getByLabel('Search your notebook to tick').fill('egg, whole, fresh');
  const choice = page
    .locator('.picker-catalogue')
    .getByRole('button', { name: new RegExp(`^${EGG.name} by `) })
    .first();
  await choice.waitFor();
  await choice.click();
  await page.getByText(/is in stock\.$/).waitFor();
  check(
    (await stockRows(page)).length === 1,
    `${label}: offline, searching the catalogue and ticking work`,
  );
  await page.goto(`${origin}/#/stock`);
  await page.getByRole('heading', { level: 1, name: 'Stock' }).waitFor();
  check((await rowNames(page)).length === 1, `${label}: offline, the list shows what was ticked`);
  await context.close();
  return problems;
};

const desktop = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const page = await context.newPage();
  await seed(page, origin);
  await openAt(page, origin, 'stock/add');
  await tickBox(page, 'Carrot').click();
  await isTicked(page, 'Carrot');
  for (const hash of ['stock', 'stock/add']) {
    await openAt(page, origin, hash);
    const o = await overflow(page);
    const small = await smallTargets(page);
    check(
      o.scroll <= 0 && o.wide.length === 0 && small.length === 0,
      `1000px #/${hash}: fits, targets at least 44 x 44 ${JSON.stringify(o)} ${small.join('; ')}`,
    );
  }
  await context.close();
};

export const stock = async (browser, server) => {
  const origin = server.origin;
  await navigation(browser, origin, 320);
  await navigation(browser, origin, 360);
  await desktop(browser, origin);
  const problems = [
    ...(await ticking(browser, origin)),
    ...(await detail(browser, origin)),
    ...(await remaining(browser, origin)),
    ...(await offline(browser, origin)),
  ];
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
};
