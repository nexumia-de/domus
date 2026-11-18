// Component and dish screens: lists, search, amounts against the engine, portions, nesting and
// back, open slots, "not weighed yet", layout at 360 and 1000 px, targets, offline.
import { check, watch } from './harness.mjs';
import { FORBIDDEN, overflow, smallTargets } from './measure.mjs';
import * as fx from './notebook-fixture.mjs';
import { controlled } from './smoke.mjs';

const DISH = 'example-flat-dough-with-sauce';
const PLATE = 'example-vegetable-plate';
const SAUCE = 'example-pan-sauce';
const STOCK = 'example-vegetable-stock';
const BASE = 'example-soft-vegetable-base';
const DOUGH = 'example-flat-dough';
const OIL = 'example-herb-oil';

const open = async (page, origin, hash) => {
  // A fresh load, like opening the app: nothing is focused until the user navigates.
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};
const cells = (page, selector) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(`${sel} tbody tr`)].map((tr) =>
        [...tr.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
      ),
    selector,
  );
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const names = (page) => page.locator('.entry-row .entry-name').allTextContents();

/** Table rows as [name, ...numbers]: the tag, role label and notes in the name cell are cut. */
const nameOf = (page, selector) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(`${sel} tbody tr`)].map((tr) =>
        [...tr.children].map((c, i) =>
          i === 0
            ? (
                (c.querySelector('a, .slot-name') ?? c.querySelector('.line-name'))?.firstChild
                  ?.textContent ?? c.textContent
              )
                .replace(/\s+/g, ' ')
                .trim()
            : c.textContent.replace(/\s+/g, ' ').trim(),
        ),
      ),
    selector,
  );

const phone = async (browser, origin) => {
  const label = '360px';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  let dialogs = 0;
  page.on('dialog', async (d) => {
    dialogs++;
    await d.dismiss();
  });

  // Lists
  await open(page, origin, 'components');
  check(
    await page.evaluate(() => document.activeElement === document.body),
    `${label}: components open with nothing focused (no text field)`,
  );
  check(
    same(
      await names(page),
      fx.components.map((c) => c.name),
    ),
    `${label}: the component list shows the ${fx.components.length} example components by name`,
  );
  check(
    (await page.locator('.example-note').innerText()) ===
      'Example data. Your own components come with the notebook.',
    `${label}: components say they are example data`,
  );
  const search = page.getByLabel('Search by name');
  await search.fill('  PAN ');
  check(
    same(
      await names(page),
      fx.components.filter((c) => /pan/i.test(c.name)).map((c) => c.name),
    ),
    `${label}: search is case-insensitive and trimmed`,
  );
  await search.fill('zzz');
  check(
    (await page.locator('.groups .empty').innerText()) === 'No component has that name.',
    `${label}: no match shows one quiet line`,
  );
  await search.fill('');
  let small = await smallTargets(page);
  check(
    small.length === 0,
    `${label}: component list targets at least 44 x 44 ${small.join('; ')}`,
  );
  let o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: component list fits ${JSON.stringify(o)}`);

  await open(page, origin, 'dishes');
  check(
    await page.evaluate(() => document.activeElement === document.body),
    `${label}: dishes open with nothing focused (no text field)`,
  );
  check(
    same(
      await names(page),
      fx.dishes.map((d) => d.name),
    ),
    `${label}: the dish list shows the ${fx.dishes.length} example dishes`,
  );
  check(
    (await page.locator('.example-note').innerText()) ===
      'Example data. Your own dishes come with the notebook.',
    `${label}: dishes say they are example data`,
  );
  await page.getByLabel('Search by name').fill('plate');
  check(same(await names(page), [fx.dish(PLATE).name]), `${label}: dish search filters by name`);
  await page.getByLabel('Search by name').fill('');
  small = await smallTargets(page);
  check(small.length === 0, `${label}: dish list targets at least 44 x 44 ${small.join('; ')}`);
  o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: dish list fits ${JSON.stringify(o)}`);

  // Open a dish; amounts equal the engine
  await page.getByRole('link', { name: new RegExp(`^${fx.dish(DISH).name}`) }).click();
  await page.getByRole('heading', { level: 1, name: fx.dish(DISH).name }).waitFor();
  check(page.url().endsWith(`#/dishes/${DISH}`), `${label}: a dish has its own route`);
  check(
    await page.evaluate(() => document.activeElement.tagName === 'H1'),
    `${label}: after navigation the dish heading has focus`,
  );
  const portions = page.getByLabel('Portions', { exact: true });
  check(
    (await portions.inputValue()) === String(fx.dish(DISH).portions),
    `${label}: portions start at the dish's own number`,
  );
  const slotsAt = async () => {
    const rows = await nameOf(page, '.slots-table');
    return rows.filter((r) => r.length === 3);
  };
  check(
    same(await slotsAt(), fx.slotTable(DISH, 4)),
    `${label}: slots in stored order with amount per portion and total (4 portions)`,
  );
  check(
    same(await page.locator('.slot-role').allTextContents(), [
      'Main element',
      'Starch',
      'Sauce',
      'Garnish',
    ]),
    `${label}: role labels in stored order`,
  );
  check(
    same(await cells(page, '.raw-table'), fx.dishRawTable(DISH, 4).table),
    `${label}: raw ingredients of the dish equal the engine (4 portions)`,
  );

  // Change portions: typing, plus, minus
  await portions.fill('6');
  check(
    same(await slotsAt(), fx.slotTable(DISH, 6)) &&
      same(await cells(page, '.raw-table'), fx.dishRawTable(DISH, 6).table),
    `${label}: 6 portions: totals and raw list equal the engine`,
  );
  await page.getByRole('button', { name: 'More portions' }).click();
  check(
    (await portions.inputValue()) === '7' &&
      same(await cells(page, '.raw-table'), fx.dishRawTable(DISH, 7).table),
    `${label}: plus gives 7 portions and the engine's raw list`,
  );
  await page.getByRole('button', { name: 'Fewer portions' }).click();
  check((await portions.inputValue()) === '6', `${label}: minus gives 6 portions`);
  await portions.fill('1');
  await page.getByRole('button', { name: 'Fewer portions' }).click();
  check((await portions.inputValue()) === '1', `${label}: portions never go below 1`);
  await portions.fill('0');
  const hint = await page.locator('.stepper .hint').innerText();
  check(
    hint === 'Enter a number above 0.' &&
      (await portions.getAttribute('aria-invalid')) === 'true' &&
      same(await slotsAt(), fx.slotTable(DISH, 1)),
    `${label}: 0 shows the hint and keeps the last results`,
  );
  await portions.fill('2,5');
  check(
    same(await slotsAt(), fx.slotTable(DISH, 2.5)) &&
      same(await cells(page, '.raw-table'), fx.dishRawTable(DISH, 2.5).table),
    `${label}: 2,5 portions (comma) is read as 2.5`,
  );
  await portions.fill('4');

  // Nested component from the dish, then from a component, back twice
  await page.getByRole('link', { name: new RegExp(`^${fx.component(SAUCE).name}`) }).click();
  await page.getByRole('heading', { level: 1, name: fx.component(SAUCE).name }).waitFor();
  check(page.url().endsWith(`#/components/${SAUCE}`), `${label}: a dish slot opens its component`);
  const sauceLines = await nameOf(page, '.lines-table');
  check(
    same(
      sauceLines.map((r) => [r[0], r[1]]),
      fx.lineTable(SAUCE).map((r) => [r[0], r[1]]),
    ),
    `${label}: sauce lines in grams equal the engine`,
  );
  check(
    (await page.locator('.lines-table .tag').allTextContents()).join() === 'component',
    `${label}: the sub-component line carries a small "component" tag`,
  );
  await page.getByRole('link', { name: new RegExp(`^${fx.component(STOCK).name}`) }).click();
  await page.getByRole('heading', { level: 1, name: fx.component(STOCK).name }).waitFor();
  check(page.url().endsWith(`#/components/${STOCK}`), `${label}: a sub-component line opens it`);
  await page.getByRole('link', { name: new RegExp(`^${fx.component(BASE).name}`) }).click();
  await page.getByRole('heading', { level: 1, name: fx.component(BASE).name }).waitFor();
  await page.goBack();
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: fx.component(SAUCE).name }).waitFor();
  check(
    page.url().endsWith(`#/components/${SAUCE}`),
    `${label}: back twice returns from the base to the sauce`,
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: fx.dish(DISH).name }).waitFor();
  check(page.url().endsWith(`#/dishes/${DISH}`), `${label}: back again returns to the dish`);
  await page.goForward();
  await page.getByRole('heading', { level: 1, name: fx.component(SAUCE).name }).waitFor();

  // Component amounts: lines, yield, scaling, portions, raw list, all from the engine
  const sauceFigures = fx.yieldFigures(SAUCE);
  const figures = await page.locator('.figure').allTextContents();
  check(
    same(
      figures.map((t) => t.replace(/^[^0-9]+/, '')),
      [sauceFigures.input, sauceFigures.output, sauceFigures.loss, sauceFigures.pct],
    ),
    `${label}: input, output, loss and yield percent equal the engine (${figures.join(' | ')})`,
  );
  check(
    same(await cells(page, '.raw-table'), fx.componentRaw(SAUCE)),
    `${label}: sauce raw list, one run, equals the engine (three levels down)`,
  );
  await page.getByLabel('Output wanted (g)').fill('200');
  check(
    same(await cells(page, '.raw-table'), fx.componentRaw(SAUCE, 200)),
    `${label}: 200 g of sauce scales the nested yield like the engine`,
  );
  await page.getByLabel('Weight of one portion (g)').fill('75');
  check(
    (await page.locator('.portions-result').innerText()) === fx.portionsLine(200, 75),
    `${label}: portions from the output weight equal the engine`,
  );
  await page.getByLabel('Output wanted (g)').fill('abc');
  check(
    (await page.locator('.scale .hint').innerText()) === 'Enter a number above 0.',
    `${label}: a text that is not a number shows the hint`,
  );
  check(
    same(await cells(page, '.raw-table'), fx.componentRaw(SAUCE)),
    `${label}: and the raw list is the recipe as written again`,
  );
  check(
    (await page.locator('.raw-extra li').allTextContents()).join().includes('Salt (in'),
    `${label}: the line without an amount is listed apart ("Salt (in ...)")`,
  );

  // Edible portion note
  await open(page, origin, `components/${BASE}`);
  const lineRows = await page.evaluate(() =>
    [...document.querySelectorAll('.lines-table tbody tr')].map((tr) => ({
      name: tr.children[0].querySelector('.line-name').firstChild.textContent.trim(),
      extra: tr.querySelector('.line-extra')?.textContent ?? '',
    })),
  );
  const extra = Object.fromEntries(lineRows.map((r) => [r.name, r.extra]));
  check(
    extra.Onion.includes(fx.buyAbout('onion', 'raw', 200)) &&
      extra.Carrot.includes(fx.buyAbout('carrot', 'raw', 100)) &&
      !extra.Celery.includes('buy about') &&
      !extra.Butter.includes('buy about'),
    `${label}: "buy about" only where a yield is recorded (${JSON.stringify(extra)})`,
  );

  // Percent lines with a base
  await open(page, origin, `components/${DOUGH}`);
  check(
    same(await nameOf(page, '.lines-table'), fx.lineTable(DOUGH)) &&
      (await page.locator('.lines-table th').nth(2).innerText()) === '% of flour',
    `${label}: dough lines show grams and percent of the flour, as the engine computes them`,
  );

  // A component without output weight
  await open(page, origin, `components/${OIL}`);
  const body = await page.locator('.card').innerText();
  check(
    body.includes('Output not weighed yet') &&
      (await page.getByLabel('Factor (1 is the recipe as written)').count()) === 1 &&
      (await page.getByLabel('Weight of one portion (g)').count()) === 0,
    `${label}: no output weight: neutral line, a factor field, no portions field`,
  );
  check(
    (await page.locator('.lines-table td.num').allTextContents()).includes('to taste'),
    `${label}: a line without an amount says "to taste"`,
  );
  await page.getByLabel('Factor (1 is the recipe as written)').fill('2');
  const oilRaw = await cells(page, '.raw-table');
  check(
    same(
      oilRaw.map((r) => r[1]),
      fx.componentRaw(OIL).map((r) => `${parseFloat(r[1]) * 2} g`),
    ),
    `${label}: a factor of 2 doubles the amounts (${oilRaw.map((r) => r.join(' ')).join('; ')})`,
  );

  // Open slot and a slot that cannot be scaled
  await open(page, origin, `dishes/${PLATE}`);
  const openText = await page.locator('.slot-open').allInnerTexts();
  check(
    same(openText, ['Open: add a crunch']),
    `${label}: an open slot is an invitation (${openText})`,
  );
  const alarms = await page.evaluate(() => ({
    alert: document.querySelectorAll('[role=alert], [aria-invalid=true]').length,
    openMarks: document.querySelectorAll('.slot-open [role], .slot-open svg, .slot-open img')
      .length,
    openColor: getComputedStyle(document.querySelector('.slot-invite')).color,
    mutedColor: getComputedStyle(document.querySelector('.slot-role')).color,
  }));
  check(
    alarms.alert === 0 && alarms.openMarks === 0 && alarms.openColor === alarms.mutedColor,
    `${label}: the open slot has no alert role, no icon and the quiet text colour (${JSON.stringify(alarms)})`,
  );
  const css = await (await page.request.get(`${origin}/app.css`)).text();
  check(
    !/--(danger|error|alert|warning|invalid)\b/i.test(css),
    `${label}: no error, danger or warning colour token exists`,
  );
  const plateRaw = fx.dishRawTable(PLATE, 2);
  check(
    same(await cells(page, '.raw-table'), plateRaw.table) && plateRaw.skipped.length === 1,
    `${label}: the dish without a weighed herb oil still adds up the other slots like the engine`,
  );
  check(
    (await page.locator('.raw-extra li').allTextContents()).some((t) =>
      /Herb oil is not weighed yet/.test(t),
    ),
    `${label}: the slot that cannot be scaled says so in plain words`,
  );
  check(
    same(
      (await nameOf(page, '.slots-table')).filter((r) => r.length === 3),
      fx.slotTable(PLATE, 2),
    ),
    `${label}: that slot still shows its amount per portion and total`,
  );

  // Unknown ids
  await open(page, origin, 'components/nope');
  check(
    (await page.getByRole('heading', { level: 1 }).innerText()) === 'Components' &&
      (await page.locator('.note-quiet').first().innerText()) ===
        'That component is not in the notebook.' &&
      page.url().endsWith('#/components/nope'),
    `${label}: unknown component id shows the list with a quiet note`,
  );
  await open(page, origin, 'dishes/nope');
  check(
    (await page.locator('.note-quiet').first().innerText()) === 'That dish is not in the notebook.',
    `${label}: unknown dish id shows the list with a quiet note`,
  );

  // Every new screen: fits 360 px (stress values entered), targets, wording, names
  const screens = [
    ...fx.components.map((c) => `components/${c.id}`),
    ...fx.dishes.map((d) => `dishes/${d.id}`),
  ];
  const bad = [];
  const tiny = [];
  let words = true;
  let unnamed = 0;
  for (const route of screens) {
    await open(page, origin, route);
    const focusOk = await page.evaluate(() => document.activeElement === document.body);
    if (!focusOk) bad.push(`${route} focus`);
    const stress = route.startsWith('dishes/') ? '123456789.5' : '98765432.1';
    const fields = page.locator('.card input.field');
    for (let i = 0; i < (await fields.count()); i++) await fields.nth(i).fill(stress);
    const m = await overflow(page);
    if (m.scroll > 0 || m.wide.length > 0) bad.push(`${route} ${JSON.stringify(m)}`);
    tiny.push(...(await smallTargets(page)).map((t) => `${route}: ${t}`));
    const text = await page.locator('main').innerText();
    if (FORBIDDEN.test(text)) words = false;
    unnamed += await page.evaluate(
      () =>
        [...document.querySelectorAll('main a, main button, main input, main summary')].filter(
          (n) =>
            !(
              n.getAttribute('aria-label') ||
              n.textContent.trim() ||
              n.labels?.[0]?.textContent.trim()
            ),
        ).length,
    );
  }
  const longest = fx.nb.ingredientName('tomato-pepper-puree');
  check(
    bad.length === 0,
    `${label}: all ${screens.length} detail screens fit 360 px, none focuses a field (longest name "${longest.slice(0, 30)}...", three-level nesting, long numbers) ${bad.join('; ')}`,
  );
  check(tiny.length === 0, `${label}: detail screens: targets at least 44 x 44 ${tiny.join('; ')}`);
  check(words, `${label}: no wording says wrong, invalid, failed or missing`);
  check(unnamed === 0, `${label}: every control on the new screens has a name`);

  check(dialogs === 0, `${label}: no dialog at all`);
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

const desktop = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, `dishes/${DISH}`);
  const boxes = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      list: b('.entry-list'),
      card: b('.card'),
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(
    boxes.list.right <= boxes.card.left,
    'desktop: the dish list stands in a column beside the dish',
  );
  check(boxes.scroll <= 0, 'desktop: no horizontal scroll');
  check(
    (await page.locator('.entry-row[aria-current="page"]').innerText()).startsWith(
      fx.dish(DISH).name,
    ),
    'desktop: the open dish is marked in the list',
  );
  check((await smallTargets(page)).length === 0, 'desktop: targets at least 44 x 44');
  check(
    (await page.getByRole('heading', { level: 1 }).allInnerTexts()).join() === fx.dish(DISH).name,
    'desktop: one h1, the dish name',
  );
  await page.getByLabel('Portions', { exact: true }).fill('8');
  await page
    .getByRole('link', { name: new RegExp(`^${fx.dish(PLATE).name}`) })
    .first()
    .click();
  await page.getByRole('heading', { level: 1, name: fx.dish(PLATE).name }).waitFor();
  check(
    same(
      (await nameOf(page, '.slots-table')).filter((r) => r.length === 3),
      fx.slotTable(PLATE, fx.dish(PLATE).portions),
    ),
    'desktop: another dish opens beside the list',
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: fx.dish(DISH).name }).waitFor();
  check(page.url().endsWith(`#/dishes/${DISH}`), 'desktop: back returns to the previous dish');
  await open(page, origin, `components/${SAUCE}`);
  check(
    (await page.locator('.entry-row[aria-current="page"]').innerText()).startsWith(
      fx.component(SAUCE).name,
    ) && (await page.locator('.card').count()) === 1,
    'desktop: a component opens beside its list, the open one marked',
  );
  await open(page, origin, 'components');
  check(
    (await page.getByText('Choose a component to see what goes into it.').isVisible()) &&
      (await page.locator('.card').count()) === 0,
    'desktop: the list without a component says so quietly',
  );
  check(
    problems.length === 0,
    `desktop: no console errors or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

const offline = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, new URL(origin).origin);
  const page = await context.newPage();
  await page.goto(`${origin}#/dishes`);
  await page.getByRole('heading', { level: 1, name: 'Dishes' }).waitFor();
  await controlled(page);
  await context.setOffline(true);
  await page.goto(new URL(`#/dishes/${PLATE}`, page.url()).href);
  await page.reload();
  await page.getByRole('heading', { level: 1, name: fx.dish(PLATE).name }).waitFor();
  check(
    same(await cells(page, '.raw-table'), fx.dishRawTable(PLATE, 2).table),
    'dishes offline: a dish reloads and adds up like the engine',
  );
  await page.getByRole('link', { name: new RegExp(`^${fx.component(SAUCE).name}`) }).click();
  await page.getByRole('heading', { level: 1, name: fx.component(SAUCE).name }).waitFor();
  check(
    same(await cells(page, '.raw-table'), fx.componentRaw(SAUCE)),
    'components offline: a component opens from the dish and shows the engine amounts',
  );
  check(problems.length === 0, 'components offline: no console errors or foreign requests');
  await context.close();
};

export const components = async (browser, server) => {
  await phone(browser, server.origin);
  await desktop(browser, server.origin);
  await offline(browser, server.url);
};
