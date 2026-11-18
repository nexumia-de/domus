// Ratio list, cards, calculator, comparison: browser checks.
import { PIE_500, seed, shown, VECTOR_CASES } from './ratio-fixture.mjs';
import { check, watch } from './harness.mjs';
import { FORBIDDEN, overflow, smallTargets } from './measure.mjs';
import { controlled } from './smoke.mjs';

const open = async (page, origin, hash) => {
  await page.goto(`${origin}/?no-sw#/ratios${hash ?? ''}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};
const names = (page) => page.locator('.ratio-row .ratio-name').allTextContents();
const amounts = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.amounts tbody tr')].map((tr) => [
        tr.children[0].textContent,
        tr.children[1].textContent,
      ]),
    ),
  );
const sameAmounts = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const phone = async (browser, origin, label) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  let dialogs = 0;
  page.on('dialog', async (d) => {
    dialogs++;
    await d.dismiss();
  });

  // List
  await open(page, origin);
  check(
    await page.evaluate(() => document.activeElement === document.body),
    `${label}: list opens with nothing focused (no text field)`,
  );
  const all = await names(page);
  check(
    all.length === seed.length && seed.every((t) => all.includes(t.name)),
    `${label}: list shows the ${seed.length} seed templates by name`,
  );
  const heads = await page.locator('.family-group h2').allTextContents();
  check(heads.length === 0, `${label}: families of one member have no heading (${heads.length})`);
  const row = await page.locator('.ratio-row', { hasText: 'Pie dough' }).innerText();
  check(
    /3 : 2 : 1/.test(row) && /flour : fat : water/.test(row),
    `${label}: row shows "3 : 2 : 1" with roles`,
  );
  const search = page.getByLabel('Search by name');
  await search.fill('  PIE ');
  check(
    (await names(page)).join() === 'Pie dough',
    `${label}: search is case-insensitive and trimmed`,
  );
  await search.fill('roux');
  check((await names(page)).length === 2, `${label}: search "roux" finds both roux templates`);
  await search.fill('zzz');
  check(
    (await names(page)).length === 0 &&
      (await page.locator('.groups .empty').innerText()) === 'No ratio has that name.',
    `${label}: empty search shows one quiet line`,
  );
  await search.fill('');
  check((await names(page)).length === seed.length, `${label}: clearing the search shows all`);
  let small = await smallTargets(page);
  check(small.length === 0, `${label}: list targets at least 44 x 44 ${small.join('; ')}`);
  let o = await overflow(page);
  check(
    o.scroll <= 0 && o.wide.length === 0,
    `${label}: list has no horizontal scroll ${JSON.stringify(o)}`,
  );

  // Card by link, back gesture
  await search.fill('pie');
  await page.getByRole('link', { name: /^Pie dough/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Pie dough' }).waitFor();
  check(page.url().endsWith('#/ratios/pie-dough'), `${label}: the card has its own route`);
  check(
    await page.evaluate(() => document.activeElement.tagName === 'H1'),
    `${label}: after navigation the card heading has focus`,
  );
  check(
    (await page.title()) === "Pie dough - Cook's Notebook",
    `${label}: document title names the card`,
  );
  check(
    !(await page.locator('.ratio-list').isVisible()),
    `${label}: on a phone the list is not beside the card`,
  );
  const table = await page.evaluate(() =>
    [...document.querySelectorAll('.parts tbody tr')].map((tr) =>
      [...tr.children].map((c) => c.textContent),
    ),
  );
  check(
    JSON.stringify(table) ===
      JSON.stringify([
        ['flour', '3', '100'],
        ['fat', '2', '66.67'],
        ['water', '1', '33.33'],
      ]),
    `${label}: parts table with percent of the anchor ${JSON.stringify(table)}`,
  );
  check(
    (await page.locator('.source').innerText()).startsWith('Source: docs/ratios.md'),
    `${label}: source line`,
  );
  check(
    (await page.locator('.family').count()) === 0,
    `${label}: no family section without parent or variations`,
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  check(
    (await names(page)).join() === 'Pie dough' &&
      (await page.getByLabel('Search by name').inputValue()) === 'pie',
    `${label}: the back gesture returns to the list with the search kept`,
  );
  await page.goForward();
  await page.getByRole('heading', { level: 1, name: 'Pie dough' }).waitFor();

  // Calculator: 500 g of flour
  await open(page, origin, `/${PIE_500.template}`);
  check(
    await page.evaluate(
      () => !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName),
    ),
    `${label}: a card opens with no field focused`,
  );
  check(
    (await page.locator('.results').innerText()).includes('Enter an amount'),
    `${label}: nothing is calculated before an entry`,
  );
  await page.locator('.calc input.field').fill(String(PIE_500.grams));
  check(
    sameAmounts(await amounts(page), PIE_500.expected),
    `${label}: 500 g flour gives ${JSON.stringify(PIE_500.expected)} (333.33.. and 166.66.. rounded to 1 g)`,
  );
  const cautions = await page.locator('.notes').innerText();
  check(
    cautions.includes('Cooking time does not scale with the amounts.') &&
      !cautions.includes('Salt'),
    `${label}: time note, no salt note for pie dough`,
  );

  // Units
  await page.getByLabel('Show amounts in').selectOption('kg');
  check(
    sameAmounts(await amounts(page), { flour: '0.5 kg', fat: '0.333 kg', water: '0.167 kg' }),
    `${label}: result unit kg`,
  );
  await page.getByLabel('Show amounts in').selectOption('g');
  await page.getByLabel('Unit', { exact: true }).selectOption('lb');
  await page.locator('.calc input.field').fill('1');
  check(
    sameAmounts(await amounts(page), { flour: '454 g', fat: '302 g', water: '151 g' }),
    `${label}: entry unit lb (1 lb = 453.59 g)`,
  );
  await page.getByLabel('Unit', { exact: true }).selectOption('oz');
  check(
    sameAmounts(await amounts(page), { flour: '28 g', fat: '19 g', water: '9.4 g' }),
    `${label}: entry unit oz (1 oz = 28.35 g)`,
  );
  await page.getByLabel('Unit', { exact: true }).selectOption('g');
  await page.getByLabel('Show amounts in').selectOption('oz');
  await page.locator('.calc input.field').fill('500');
  check(
    sameAmounts(await amounts(page), { flour: '17.64 oz', fat: '11.75 oz', water: '5.89 oz' }),
    `${label}: result unit oz`,
  );
  await page.getByLabel('Show amounts in').selectOption('g');

  // Invalid entry: inline hint, no dialog, previous results dimmed
  const amount = page.locator('.calc input.field');
  await amount.fill('5x0');
  const hint = await page.locator('.calc .hint').innerText();
  const dim = await page.locator('.amounts').evaluate((n) => getComputedStyle(n).opacity);
  check(hint === 'Enter a number above 0.', `${label}: invalid entry shows the inline hint`);
  check(
    sameAmounts(await amounts(page), PIE_500.expected) && Number(dim) < 1,
    `${label}: previous results stay, dimmed (opacity ${dim})`,
  );
  check(
    (await amount.getAttribute('aria-invalid')) === 'true',
    `${label}: field is marked aria-invalid`,
  );
  for (const bad of ['0', '-3', 'abc', '1e3']) {
    await amount.fill(bad);
    if ((await page.locator('.calc .hint').innerText()) !== 'Enter a number above 0.') {
      check(false, `${label}: "${bad}" gets the hint`);
    }
  }
  check(dialogs === 0, `${label}: no dialog opened`);
  await amount.fill('500,5');
  check(
    (await page.locator('.calc .hint').innerText()) === '' &&
      (await amounts(page)).flour === '501 g',
    `${label}: 500,5 (comma) is read as 500.5, shown as 501 g`,
  );
  await amount.fill('');
  check(
    (await page.locator('.calc .hint').innerText()) === '' &&
      (await page.locator('.amounts').count()) === 0,
    `${label}: empty field has no hint and no results`,
  );

  // Total and factor modes
  await page.getByRole('radio', { name: 'Total weight' }).check();
  await amount.fill('1');
  await page.getByLabel('Unit', { exact: true }).selectOption('kg');
  check(
    sameAmounts(await amounts(page), PIE_500.expected),
    `${label}: total weight 1 kg of 3:2:1 gives 500, 333, 167 g`,
  );
  await page.getByRole('radio', { name: 'Factor' }).check();
  check(
    (await page.getByLabel('Unit', { exact: true }).isHidden()) &&
      (await page.getByText('One part is one gram times the factor.').isVisible()),
    `${label}: factor mode has no unit and explains itself`,
  );
  await amount.fill('10');
  check(
    sameAmounts(await amounts(page), { flour: '30 g', fat: '20 g', water: '10 g' }),
    `${label}: factor 10 reads parts as grams times 10`,
  );
  await page.getByRole('radio', { name: 'From one ingredient' }).check();
  check(
    await page.getByLabel('Ingredient', { exact: true }).isVisible(),
    `${label}: back to one ingredient`,
  );

  // Vector-derived cases: three ratios
  for (const c of VECTOR_CASES) {
    await open(page, origin, `/${c.template}`);
    await page.getByLabel('Ingredient', { exact: true }).selectOption(c.role);
    await page.locator('.calc input.field').fill(String(c.grams));
    check(c.partsMatch, `${label}: vector ${c.vector} template is the seed template ${c.template}`);
    check(
      sameAmounts(await amounts(page), c.expected),
      `${label}: ${c.template} from ${c.grams} g ${c.role} equals vector ${c.vector} ${JSON.stringify(c.expected)}`,
    );
  }

  // Baker's percentages: both cautions, ranges, comparison
  await open(page, origin, '/bread-dough-bakers-percent');
  await page.locator('.calc input.field').fill('500');
  check(
    sameAmounts(await amounts(page), {
      flour: '500 g',
      water: '300 g',
      yeast: '15 g',
      salt: '10 g',
    }),
    `${label}: bread dough from 500 g flour`,
  );
  const both = await page.locator('.notes').innerText();
  check(
    both.includes('Salt does not scale linearly: taste.') && both.includes('Cooking time'),
    `${label}: salt and time notes`,
  );
  check(
    (await page.locator('.parts .range').innerText()) === 'usual 1.8–2',
    `${label}: range shown as "usual 1.8-2" beside the part`,
  );
  const summary = page.getByText('Compare my amounts');
  await summary.click();
  const salt = page.getByLabel('salt (g)');
  await page.getByLabel('flour (g)').fill('500');
  for (const [g, phrase] of [
    ['8', 'below the usual range by 0.2'],
    ['9', 'within the usual range'],
    ['10', 'within the usual range'],
    ['11', 'above the usual range by 0.2'],
  ]) {
    await salt.fill(g);
    check(
      (await page.locator('.compare-out').innerText()).includes(phrase),
      `${label}: flour 500, salt ${g}: "${phrase}"`,
    );
  }
  await salt.fill('x');
  check(
    (await page.locator('.compare .hint').innerText()) === 'Enter a number above 0.',
    `${label}: compare entry hint`,
  );
  await salt.fill('9');
  o = await overflow(page);
  check(
    o.scroll <= 0 && o.wide.length === 0,
    `${label}: card with results and comparison, no horizontal scroll ${JSON.stringify(o)}`,
  );
  small = await smallTargets(page);
  check(small.length === 0, `${label}: card targets at least 44 x 44 ${small.join('; ')}`);
  const text = await page.locator('main').innerText();
  check(!FORBIDDEN.test(text), `${label}: no wording says wrong, invalid, failed or missing`);
  const unnamed = await page.evaluate(
    () =>
      [...document.querySelectorAll('a, button, input, select, summary')].filter(
        (n) =>
          !(
            n.getAttribute('aria-label') ||
            n.textContent.trim() ||
            n.labels?.[0]?.textContent.trim()
          ),
      ).length,
  );
  check(unnamed === 0, `${label}: every control on the card has a name`);

  // Every card at 360: no horizontal scroll, longest name included
  const longest = [...seed].sort((a, b) => b.name.length - a.name.length)[0];
  let bad = [];
  for (const t of seed) {
    await open(page, origin, `/${t.id}`);
    await page.locator('.calc input.field').fill('1234.5');
    await page.getByLabel('Unit', { exact: true }).selectOption('lb');
    await page.getByText('Compare my amounts').click();
    for (const p of t.parts) await page.getByLabel(`${p.role} (g)`).fill('333');
    const m = await overflow(page);
    if (m.scroll > 0 || m.wide.length > 0) bad.push(`${t.id} ${JSON.stringify(m)}`);
  }
  check(
    bad.length === 0,
    `${label}: all ${seed.length} cards fit 360 px (longest name "${longest.name}") ${bad.join('; ')}`,
  );

  // Unknown id
  await open(page, origin, '/nope');
  check(
    (await page.getByRole('heading', { level: 1 }).innerText()) === 'Ratios' &&
      (await page.locator('.note-quiet').innerText()) === 'That ratio is not in the list.' &&
      page.url().endsWith('#/ratios/nope'),
    `${label}: unknown id shows the list with a quiet note`,
  );

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
  await open(page, origin, '/pie-dough');
  const boxes = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      list: b('.ratio-list'),
      card: b('.card'),
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(boxes.list.right <= boxes.card.left, 'desktop: list in a column beside the card');
  check(boxes.scroll <= 0, 'desktop: no horizontal scroll');
  check(
    (await page.locator('.ratio-row[aria-current="page"]').innerText()).startsWith('Pie dough'),
    'desktop: the open card is marked in the list',
  );
  check((await smallTargets(page)).length === 0, 'desktop: targets at least 44 x 44');
  check(
    (await page.getByRole('heading', { level: 1 }).allInnerTexts()).join() === 'Pie dough',
    'desktop: one h1, the card name',
  );
  // card -> another card -> back
  await page.getByLabel('Search by name').fill('dough');
  await page.getByRole('link', { name: /^Pasta dough/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Pasta dough' }).waitFor();
  check(
    (await page.getByLabel('Search by name').inputValue()) === 'dough' &&
      (await page.locator('.ratio-list').isVisible()),
    'desktop: the list stays with its search when another card opens',
  );
  await page.locator('.calc input.field').fill('165');
  await page.getByLabel('Ingredient', { exact: true }).selectOption('egg');
  check(
    sameAmounts(await amounts(page), { flour: shown(247.5), egg: '165 g' }),
    'desktop: pasta 165 g egg gives flour 248 g (247.5 rounded half up)',
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: 'Pie dough' }).waitFor();
  check(page.url().endsWith('#/ratios/pie-dough'), 'desktop: back returns to the previous card');
  await page.goForward();
  await page.getByRole('heading', { level: 1, name: 'Pasta dough' }).waitFor();
  await page.goto(`${origin}/?no-sw#/ratios`);
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  check(
    (await page.getByText('Choose a ratio to see its card.').isVisible()) &&
      (await page.locator('.card').count()) === 0,
    'desktop: list without a card says so quietly',
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
  await page.goto(`${origin}#/ratios`);
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  await controlled(page);
  await context.setOffline(true);
  await page.goto(new URL('#/ratios/pie-dough', page.url()).href);
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Pie dough' }).waitFor();
  await page.locator('.calc input.field').fill('500');
  check(
    sameAmounts(await amounts(page), PIE_500.expected),
    'ratios offline: a card reloads and calculates',
  );
  check(problems.length === 0, 'ratios offline: no console errors or foreign requests');
  await context.close();
};

export const ratios = async (browser, server) => {
  await phone(browser, server.origin, '360px');
  await desktop(browser, server.origin);
  await offline(browser, server.url);
};
