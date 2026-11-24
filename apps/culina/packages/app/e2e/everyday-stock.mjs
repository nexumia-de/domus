// An everyday stock on the real shipped content, in German at 360 x 720, by the route a tester took
// on 2026-11-21: Vorrat, "Vorrat anhaken", twelve foods searched by their German names, each the
// entry the catalogue offers first; then "Grundzutaten anhaken" (salt and pepper as always there);
// then Kochen with "Nur mit dem, was da ist" (docs/decisions/cook-screen.md; until 2026-11-22 "Was
// kann ich kochen" with "Nur vollständige"). Checks: the potato is offered for "Kartoffel" (not
// potato flour); shipped dishes the stock covers are listed, with no English name and no judging
// word; the staples offer goes once ticked; no horizontal scroll, targets of at least 44 px, no
// console error. The egg group counting for the egg, the ratio cards' German names and the role
// words' capitals are the finder's reasons, kept in test/finder-everyday-stock.test.ts. Not proved
// here: a real phone, amounts in stock, desktop width.
import { check, watch } from './harness.mjs';
import { FORBIDDEN, overflow, smallTargets } from './measure.mjs';
import { rowNamed, shownName } from './catalogue-helpers.mjs';
import { stockItems } from './stock-helpers.mjs';

const label = 'everyday stock (German, 360px)';
const WORDS = [
  'Hühnerei',
  'Butter',
  'Weizenmehl',
  'Milch',
  'Zwiebel',
  'Kartoffel',
  'Tomaten',
  'Sahne',
  'Käse',
  'Reis',
  'Zitronensaft',
  'Knoblauch',
];
const NOW = '2026-11-21T08:00:00Z';

const measure = async (page, where) => {
  const o = await overflow(page);
  check(o.scroll <= 0, `${label} ${where}: no horizontal scroll ${o.wide.join(',')}`);
  const small = await smallTargets(page);
  check(small.length === 0, `${label} ${where}: targets of at least 44 px ${small.join('; ')}`);
};

export const everydayStock = async (browser, server) => {
  const origin = server.origin;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'de' });
  // An about:blank document has no storage; the app's own pages do.
  await context.addInitScript(() => {
    if (location.protocol.startsWith('http')) localStorage.setItem('culina.lang', 'de');
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  const query = `?no-sw&e2e-store&e2e-now=${NOW}`;
  await page.goto(`${origin}/${query}#/stock`);
  await page.getByRole('heading', { level: 1, name: 'Vorrat' }).waitFor();

  // The staples are offered on the empty stock, with their names.
  const staples = page.locator('.stock-staples');
  await staples.getByRole('button', { name: 'Grundzutaten anhaken' }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector('.stock-staples-tick')?.hasAttribute('disabled'),
  );
  const hint = await staples.locator('p').innerText();
  check(
    hint.includes(shownName(rowNamed('Salt, table'), 'de')),
    `${label}: the staples offer names the salt (${hint})`,
  );
  await measure(page, 'empty stock with the staples offer');

  await page.getByRole('link', { name: 'Vorrat anhaken' }).first().click();
  await page.getByRole('heading', { level: 1, name: 'Vorrat anhaken' }).waitFor();
  const offered = [];
  for (const word of WORDS) {
    await page.getByRole('searchbox').fill(word);
    const first = page.locator('.picker-catalogue .picker-choice').first();
    await first.waitFor();
    offered.push((await first.locator('.entry-name').innerText()).trim());
    const before = (await stockItems(page)).length;
    await first.click();
    await page.waitForFunction(
      async (n) => (await globalThis.__culinaStock.items()).length > n,
      before,
    );
  }
  check(
    offered[WORDS.indexOf('Kartoffel')] === 'Kartoffel' &&
      offered[WORDS.indexOf('Tomaten')] === 'Tomaten',
    `${label}: the entry named as typed is offered first (${offered.join(', ')})`,
  );
  const ticked = (await stockItems(page)).map((i) => i.ref.id);
  check(
    ticked.includes('fdc-170028') && !ticked.includes('fdc-168446'),
    `${label}: the potato is ticked, not potato flour`,
  );

  // Back to the stock: tick the staples.
  await page.getByRole('link', { name: 'Zurück zum Vorrat' }).click();
  await page.getByRole('heading', { level: 1, name: 'Vorrat' }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector('.stock-staples-tick')?.hasAttribute('disabled'),
  );
  await page.getByRole('button', { name: 'Grundzutaten anhaken' }).click();
  await page.waitForFunction(
    async () => (await globalThis.__culinaStock.items()).filter((i) => i.always).length === 2,
  );
  await page.locator('.stock-staples').waitFor({ state: 'detached' });
  check(true, `${label}: the staples offer goes once salt and pepper are ticked`);
  const rows = await page.locator('.stock-rows').innerText();
  check(rows.includes('immer da'), `${label}: salt and pepper show as always there`);

  // Cook, only with what is there: shipped dishes the stock covers, in German. (The reasons the
  // finder gave per entry, the egg group counting for the egg, are on "What uses <ingredient>" and
  // in test/finder-everyday-stock.test.ts; Cook's list shows dishes, not those reasons:
  // docs/decisions/cook-screen.md.)
  await page.goto(`${origin}/${query}#/cook`);
  await page.getByRole('heading', { level: 1, name: 'Kochen' }).waitFor();
  await page.locator('.dish-row').first().waitFor();
  await page.getByLabel('Nur mit dem, was da ist').check();
  await page.locator('.dish-row-shipped').first().waitFor();
  const shipped = await page.locator('.dish-row-shipped').count();
  const every = await page.evaluate(
    () => JSON.parse(localStorage.getItem('culina.cookList') ?? '{}').have === true,
  );
  check(
    shipped >= 1 && every,
    `${label}: only with what is there lists shipped dishes the stock covers (${shipped})`,
  );
  const all = await page.locator('main').innerText();
  check(!/Pasta dough|Pound cake/.test(all), `${label}: no English name on Cook`);
  check(!FORBIDDEN.test(all), `${label}: Cook's wording judges nothing`);
  await measure(page, 'cook');

  check(
    problems.length === 0,
    `${label}: no console error or foreign request ${problems.join('; ')}`,
  );
  await context.close();
};
