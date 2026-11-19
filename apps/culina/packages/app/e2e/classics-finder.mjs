// The classics in "What can I cook", in a browser, on the fictional example dishes: they are listed
// beside the notebook's own dishes in the engine's order, the country and the "without meat and
// fish" filters drop entries, a lacking line is "Needs", a line the catalogue lacks is named apart,
// an entry opens its dish view, and the dish view shows the ingredients before the source. At
// 360 x 720 and at desktop size: no horizontal scroll, targets of at least 44 x 44, no console error.
import { check, watch } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { content, PAN, SECOND } from './classics-fixture.mjs';
import { TODAY } from './cook-fixture.mjs';
import { engine } from './notebook-fixture.mjs';

const QUERY = `?no-sw&e2e-store&e2e-content&e2e-now=${TODAY}T08:00:00Z`;
const BUTTER = 'fdc-173410';
const OIL = 'fdc-171413';
const SALT = 'fdc-173468';
const NAMES = { [BUTTER]: 'Butter, salted', [OIL]: 'Oil, olive', [SALT]: 'Salt, table' };

const open = async (page, origin, hash) => {
  await page.goto('about:blank');
  await page.addInitScript((data) => {
    globalThis.__culinaContent = data;
  }, content);
  await page.goto(`${origin}/${QUERY}#/${hash}`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
};
const stockOf = (ids) => ids.map((id) => ({ id: `s-${id}`, ref: { kind: 'ingredient', id } }));
const store = async (page, ids) => {
  const failed = await page.evaluate(
    async ({ ingredients, stock }) => {
      const opened = await globalThis.__culinaStore;
      const out = [];
      for (const [kind, list] of [
        ['ingredients', ingredients],
        ['stock', stock],
      ]) {
        for (const record of list) {
          const done = await opened.store.put(kind, record);
          if (!done.ok) out.push(`${kind} ${record.id}`);
        }
      }
      return out;
    },
    {
      ingredients: ids.map((id) => ({ id, name: NAMES[id] })),
      stock: stockOf(ids),
    },
  );
  if (failed.length > 0) throw new Error(`fixture not stored: ${failed.join('; ')}`);
};
/** The engine's classics for a stock and how much may lack, as the screen is specified. */
const expected = (ids, maxMissing) => {
  const r = engine.classicsMakeable({
    ingredients: ids.map((id) => ({ id })),
    stock: stockOf(ids),
    today: TODAY,
    facts: {},
    classics: content.classics,
    lang: 'en',
    options: { maxMissing },
  });
  if (!r.ok) throw new Error(`classicsMakeable: ${r.error.code}`);
  return r.candidates;
};
const keysOnScreen = (page) =>
  page.locator('.classic-entry').evaluateAll((items) => items.map((li) => li.dataset.id));
const fresh = async (browser, origin, width, ids) => {
  const context = await browser.newContext({
    viewport: { width, height: width < 720 ? 720 : 700 },
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, 'cook');
  await store(page, ids);
  await open(page, origin, 'cook');
  await page.locator('.cook-classics').waitFor();
  return { context, page, problems };
};
const layout = async (page, label) => {
  const o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: no horizontal scroll ${o.wide.join(',')}`);
  const small = await smallTargets(page);
  check(small.length === 0, `${label}: targets at least 44 x 44 ${small.join('; ')}`);
};
const country = (page) => page.getByLabel('Country', { exact: true });
const meat = (page) => page.getByLabel('Meat and fish', { exact: true });
const lacking = (page) => page.getByLabel('Show', { exact: true });
const settle = (page) => page.waitForTimeout(150);

const flow = async (browser, origin, width) => {
  const label = `${width}px classics in the finder`;
  const all = [BUTTER, OIL, SALT];
  const { context, page, problems } = await fresh(browser, origin, width, all);

  // Listed in the engine's order, beside the own list.
  const engineAll = expected(all, 1);
  check(
    (await page.getByRole('heading', { level: 2, name: 'Classic dishes' }).count()) === 1,
    `${label}: the classics have their own heading under the notebook's list`,
  );
  const shown = await keysOnScreen(page);
  check(
    engineAll.length === 2 && JSON.stringify(shown) === JSON.stringify(engineAll.map((c) => c.id)),
    `${label}: both classics, in the engine's order (${shown.join(', ')})`,
  );
  const statuses = await page.locator('.classic-status').allInnerTexts();
  check(
    JSON.stringify(statuses) ===
      JSON.stringify(engineAll.map((c) => (c.complete ? 'complete' : `lacks ${c.lacking}`))),
    `${label}: "complete" or "lacks N" as the engine counts (${statuses.join(', ')})`,
  );
  const secondRow = (
    await page.locator(`.classic-entry[data-id="${SECOND.id}"]`).innerText()
  ).replace(/\s+/g, ' ');
  check(
    secondRow.includes('Not in the catalogue yet, so not counted: Example broth stock') &&
      secondRow.includes('complete'),
    `${label}: a line the catalogue lacks is named apart and not counted (${secondRow})`,
  );
  check(
    (await page.locator('.classic-entry .classic-lacks').count()) === 0,
    `${label}: a complete classic names nothing it needs`,
  );
  await layout(page, `${label} list`);

  // The two filters.
  await country(page).selectOption('de');
  await settle(page);
  check(
    JSON.stringify(await keysOnScreen(page)) === JSON.stringify([PAN.id]),
    `${label}: Germany keeps the German classic only`,
  );
  await country(page).selectOption('it');
  await settle(page);
  check(
    JSON.stringify(await keysOnScreen(page)) === JSON.stringify([SECOND.id]),
    `${label}: Italy keeps the Italian classic only`,
  );
  await country(page).selectOption('');
  await meat(page).selectOption('free');
  await settle(page);
  check(
    JSON.stringify(await keysOnScreen(page)) === JSON.stringify([PAN.id]),
    `${label}: "Without meat and fish" drops the classic with meat`,
  );
  await country(page).selectOption('fr');
  await settle(page);
  check(
    (await keysOnScreen(page)).length === 0 &&
      (await page.getByText('No classic fits these choices.').count()) === 1,
    `${label}: a country with nothing says so quietly`,
  );
  const kept = await page.evaluate(() => localStorage.getItem('culina.cook'));
  check(
    kept.includes('"country":"fr"') && kept.includes('"meatFree":true'),
    `${label}: both choices are kept (${kept})`,
  );
  await open(page, origin, 'cook');
  await page.locator('.cook-classics').waitFor();
  check(
    (await country(page).inputValue()) === 'fr' && (await meat(page).inputValue()) === 'free',
    `${label}: both choices come back after a reload`,
  );
  await country(page).selectOption('');
  await meat(page).selectOption('');
  await settle(page);

  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

const lackingFlow = async (browser, origin, width) => {
  const label = `${width}px classics that lack something`;
  const { context, page, problems } = await fresh(browser, origin, width, [BUTTER]);

  // What lacks is said as "Needs", neutrally; a classic beyond the threshold waits for a wider choice.
  const narrow = expected([BUTTER], 1).map((c) => c.id);
  check(
    JSON.stringify(await keysOnScreen(page)) === JSON.stringify(narrow) && !narrow.includes(PAN.id),
    `${label}: at most 1 lacking leaves out a classic that lacks 2 (${narrow.join(', ')})`,
  );
  await lacking(page).selectOption('2');
  await settle(page);
  const wide = expected([BUTTER], 2);
  check(
    JSON.stringify(await keysOnScreen(page)) === JSON.stringify(wide.map((c) => c.id)) &&
      wide.some((c) => c.id === PAN.id),
    `${label}: lacking at most 2 lists it`,
  );
  const panRow = (await page.locator(`.classic-entry[data-id="${PAN.id}"]`).innerText()).replace(
    /\s+/g,
    ' ',
  );
  check(
    /Needs: [^;]+/.test(panRow) && panRow.includes('lacks 2'),
    `${label}: what it lacks is under "Needs" (${panRow})`,
  );
  check(
    !/wrong|too much|falsch|zu viel|error/i.test(panRow),
    `${label}: the wording does not judge`,
  );

  // An entry opens the dish view.
  await page.locator(`.classic-entry[data-id="${PAN.id}"] a`).click();
  await page.getByRole('heading', { level: 1, name: PAN.name.en, exact: true }).waitFor();
  check(
    new URL(page.url()).hash === `#/classic/${PAN.id}`,
    `${label}: the entry opens #/classic/${PAN.id}`,
  );

  // The dish view in its order: name, course, portions, ingredients, button, method, then the closed blocks.
  const tops = await page.evaluate(() => {
    const top = (node) => (node === null ? null : node.getBoundingClientRect().top + scrollY);
    const heading = (text) =>
      [...document.querySelectorAll('h1, h2, h3, summary')].find(
        (h) => h.textContent.trim() === text,
      );
    return {
      name: top(document.querySelector('h1')),
      original: top(
        [...document.querySelectorAll('p')].find((p) => p.textContent.startsWith('Original name')),
      ),
      portions: top(
        document.querySelector('.stepper, [class*="stepper"]') ?? document.querySelector('input'),
      ),
      ingredients: top(heading('Ingredients')),
      firstLine: top(document.querySelector('.recipe-line')),
      cook: top(document.querySelector('.cook-start')),
      method: top(heading('Method') ?? heading('Steps')),
      source: top(heading('Source')),
      settled: top(heading('What we settled where the source is vague')),
      check: top(heading('Second check')),
      open: [...document.querySelectorAll('.foot-block')].map((d) => d.open),
      blocks: document.querySelectorAll('.foot-block').length,
      view: innerHeight,
    };
  });
  const order = [
    'name',
    'original',
    'portions',
    'ingredients',
    'cook',
    'method',
    'source',
    'settled',
    'check',
  ];
  const present = order.filter((k) => tops[k] !== null && tops[k] !== undefined);
  check(
    present.length >= 8 && present.every((k, i) => i === 0 || tops[k] > tops[present[i - 1]]),
    `${label}: name, portions, ingredients, button, method, then source, settled, check (${present.map((k) => `${k}:${Math.round(tops[k])}`).join(' ')})`,
  );
  check(
    tops.blocks === 3 && tops.open.every((o) => o === false),
    `${label}: source, settled and second check are each closed behind a tap`,
  );
  check(
    tops.firstLine < tops.view,
    `${label}: the first ingredient is on the first screen (${Math.round(tops.firstLine)} < ${tops.view})`,
  );
  await layout(page, `${label} dish`);
  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

export const classicsFinder = async (browser, server) => {
  await flow(browser, server.origin, 360);
  await flow(browser, server.origin, 1000);
  await lackingFlow(browser, server.origin, 360);
  await lackingFlow(browser, server.origin, 1000);
};
