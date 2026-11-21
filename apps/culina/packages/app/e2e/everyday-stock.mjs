// An everyday stock on the real shipped content, in German at 360 x 720, by the route a tester took
// on 2026-11-21: Vorrat, "Vorrat anhaken", twelve foods searched by their German names, each the
// entry the catalogue offers first; then "Grundzutaten anhaken" (salt and pepper as always there);
// then "Was kann ich kochen" with "Nur vollständige". Checks: the potato is offered for "Kartoffel"
// (not potato flour); shipped dishes are complete (egg noodles among them) and the egg group in stock
// is named for the egg they ask; the ratio cards have their German names and ask no water; role
// words keep their capital; the staples offer goes once ticked; no horizontal scroll, targets of at
// least 44 px, no console error. Not proved here: a real phone, amounts in stock, desktop width.
import { check, watch } from './harness.mjs';
import { FORBIDDEN, overflow, smallTargets } from './measure.mjs';
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
  check(hint.includes('Speisesalz'), `${label}: the staples offer names the salt (${hint})`);
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

  // The finder, complete only.
  await page.goto(`${origin}/${query}#/cook`);
  await page.getByRole('heading', { level: 1, name: 'Was kann ich kochen' }).waitFor();
  await page.getByLabel('Anzeigen').selectOption('0');
  await page.locator('.cook-entry').first().waitFor();
  const entry = (id) => page.locator(`.cook-entry[data-id="${id}"]`);
  const shipped = await page.locator('.cook-entry[data-origin="shipped"]').count();
  check(shipped >= 7, `${label}: complete only lists shipped dishes (${shipped})`);
  const noodles = (await entry('egg-noodles').innerText()).replace(/\s+/g, ' ');
  check(
    noodles.includes('Eiernudeln') && noodles.includes('vollständig'),
    `${label}: the egg noodles are complete (${noodles})`,
  );
  check(
    noodles.includes('Hühnerei im Vorrat zählt für Ei'),
    `${label}: the egg group in stock is named for the egg the noodles ask`,
  );
  check(/deckt [A-ZÄÖÜ]/.test(noodles), `${label}: a role word keeps its capital (${noodles})`);
  const pasta = (await entry('pasta-dough').innerText()).replace(/\s+/g, ' ');
  check(
    pasta.includes('Nudelteig') && pasta.includes('vollständig'),
    `${label}: the pasta dough card has its German name and is complete (${pasta})`,
  );
  const all = await page.locator('main').innerText();
  check(
    !/Pasta dough|Pound cake|Noch nötig: [^\n]*Wasser/.test(all),
    `${label}: no English card name, no water asked`,
  );
  check(!FORBIDDEN.test(all), `${label}: the finder's wording judges nothing`);
  await measure(page, 'finder');

  check(
    problems.length === 0,
    `${label}: no console error or foreign request ${problems.join('; ')}`,
  );
  await context.close();
};
