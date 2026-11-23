// "Only with what I have" on Cook (docs/decisions/cook-screen.md), in a browser, on the fictional
// example dishes and one own dish written here: the switch keeps exactly the dishes, own and
// shipped, whose every required line the stock covers as the engine judges (`makeable` and
// `classicsMakeable` at threshold 0, as src/dishes/ready-now.ts asks), in the list's order by name;
// a line the catalogue lacks is not counted against a shipped dish; the one dish filter (course,
// character, cuisine, origin, without meat and fish) narrows within it and stays `culina.dishes`;
// the switch is kept (`culina.cookList`) and survives a reload; a dish that lacks something is
// there only with the switch off; an entry opens its dish view, and the dish view shows the
// ingredients before the source. At 360 x 720 and at desktop size: no horizontal scroll, targets of
// at least 44 x 44, no console error. Not proved here: German, a real phone, the 48 real dishes.
import { check, watch } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { content, PAN, SECOND } from './classics-fixture.mjs';
import { TODAY } from './cook-fixture.mjs';
import { engine } from './notebook-fixture.mjs';
import { addStock } from './stock-helpers.mjs';

const QUERY = `?no-sw&e2e-store&e2e-content&e2e-now=${TODAY}T08:00:00Z`;
const BUTTER = 'fdc-173410';
const OIL = 'fdc-171413';
const SALT = 'fdc-173468';
const NAMES = { [BUTTER]: 'Butter, salted', [OIL]: 'Oil, olive', [SALT]: 'Salt, table' };
/** An own dish, invented here: fried, so its character differs from the classics' "Uncooked". */
const OWN = {
  id: 'e2e-fried-butter',
  name: 'Fried butter bread',
  portions: 2,
  slots: [
    { role: 'main', ref: { kind: 'ingredient', id: BUTTER }, amount: { value: 30, unit: 'g' } },
  ],
  steps: [{ technique: 'pan-fry' }],
  version: { family: 'e2e-fried-butter', date: '2026-11-01' },
};

const open = async (page, origin, hash) => {
  await page.goto('about:blank');
  await page.addInitScript((data) => {
    globalThis.__culinaContent = data;
  }, content);
  await page.goto(`${origin}/${QUERY}#/${hash}`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
};
/** Details of a stock item by ingredient id (a use-by date); none for the others. */
let DETAIL = {};
const stockOf = (ids) =>
  ids.map((id) => ({ id, ref: { kind: 'ingredient', id }, ...(DETAIL[id] ?? {}) }));
const store = async (page, ids, dishes) => {
  const failed = await page.evaluate(
    async ({ ingredients, dishes }) => {
      const opened = await globalThis.__culinaStore;
      const out = [];
      for (const record of ingredients) {
        const done = await opened.store.put('ingredients', record);
        if (!done.ok) out.push(`ingredients ${record.id}`);
      }
      for (const record of dishes) {
        const done = await opened.store.put('dishes', record);
        if (!done.ok) out.push(`dishes ${record.id}: ${JSON.stringify(done.error)}`);
      }
      return out;
    },
    { ingredients: ids.map((id) => ({ id, name: NAMES[id] })), dishes },
  );
  if (failed.length > 0) throw new Error(`fixture not stored: ${failed.join('; ')}`);
  // Stock is the shared collection of a space: one tick per ingredient.
  await addStock(
    page,
    ids.map((id) => ({ ref: { kind: 'ingredient', id }, ...(DETAIL[id] ?? {}) })),
  );
};
const ingredientsOf = (ids) => ids.map((id) => ({ id }));
/** The engine's classics for a stock and how much may lack, as the screen is specified. */
const expectedClassics = (ids, maxMissing) => {
  const r = engine.classicsMakeable({
    ingredients: ingredientsOf(ids),
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
/** The engine's own dishes on the same stock. */
const expectedOwn = (ids, maxMissing, dishes) => {
  const r = engine.makeable({
    ingredients: ingredientsOf(ids),
    components: [],
    dishes,
    templates: [],
    stock: stockOf(ids),
    today: TODAY,
    facts: {},
    options: { maxMissing },
  });
  if (!r.ok) throw new Error(`makeable: ${r.error.code}`);
  return r.candidates.filter((c) => c.kind === 'dish');
};
/** "Only with what I have" as specified: the dishes the engine finds complete at threshold 0. */
const readyKeys = (ids, dishes = []) =>
  [...expectedOwn(ids, 0, dishes), ...expectedClassics(ids, 0)]
    .filter((c) => c.complete)
    .map((c) => `${c.kind === 'classic' ? 'shipped' : 'own'}:${c.id}`)
    .sort();
const ROWS = '.dish-rows-list > li';
const keysOnScreen = (page) =>
  page.locator(ROWS).evaluateAll((items) => items.map((li) => li.dataset.key));
const idsOnScreen = async (page) => (await keysOnScreen(page)).map((k) => k.split(':')[1]);
const namesOnScreen = (page) => page.locator(`${ROWS} .entry-name`).allInnerTexts();
const have = (page) => page.getByLabel('Only with what I have');
/** Opens the folded filter (a `<details>`) when it is closed. */
const openFilter = async (page) => {
  const fold = page.locator('details.dish-filter-fold');
  if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click();
};
const fresh = async (browser, origin, width, ids, dishes = []) => {
  const context = await browser.newContext({
    viewport: { width, height: width < 720 ? 720 : 700 },
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, 'cook');
  await store(page, ids, dishes);
  await open(page, origin, 'cook');
  await page.locator('.dish-row').first().waitFor();
  return { context, page, problems };
};
const layout = async (page, label) => {
  const o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: no horizontal scroll ${o.wide.join(',')}`);
  const small = await smallTargets(page);
  check(small.length === 0, `${label}: targets at least 44 x 44 ${small.join('; ')}`);
};
const course = (page) => page.getByLabel('Course', { exact: true });
const character = (page) => page.getByLabel('What it is like', { exact: true });
const cuisine = (page) => page.getByLabel('Cuisine', { exact: true });
const originSelect = (page) => page.getByLabel('From', { exact: true });
const meatFree = (page) => page.locator('.dish-filter-meat-free input');
const kept = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('culina.dishes') ?? '{}'));
const settle = (page) => page.waitForTimeout(150);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const flow = async (browser, origin, width) => {
  const label = `${width}px only with what I have`;
  const all = [BUTTER, OIL, SALT];
  const { context, page, problems } = await fresh(browser, origin, width, all, [OWN]);
  const every = (await keysOnScreen(page)).length;

  // Off by default: every dish. On: exactly the dishes the engine finds complete, own and shipped.
  check(!(await have(page).isChecked()), `${label}: the switch is off at first (${every} dishes)`);
  await have(page).check();
  await settle(page);
  const want = readyKeys(all, [OWN]);
  const shown = await keysOnScreen(page);
  check(
    want.length >= 2 && want.includes(`own:${OWN.id}`) && same([...shown].sort(), want),
    `${label}: own and shipped dishes the stock covers, as the engine judges (${shown.join(', ')} / ${want.join(', ')})`,
  );
  const names = await namesOnScreen(page);
  check(
    same(
      names,
      [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
    ),
    `${label}: in the list's order, by name (${names.join(' | ')})`,
  );
  // The soup names a broth the catalogue does not have: not counted, so it is still there.
  check(
    shown.includes(`shipped:${SECOND.id}`),
    `${label}: a line the catalogue lacks is not counted against a shipped dish`,
  );
  check(
    (await page.evaluate(() => localStorage.getItem('culina.cookList'))) ===
      JSON.stringify({ have: true, order: 'name' }),
    `${label}: the switch is kept in culina.cookList`,
  );
  await layout(page, `${label} list`);

  // The one dish filter narrows within it and is still culina.dishes.
  await openFilter(page);
  await course(page).selectOption('soup');
  await settle(page);
  check(
    same(await idsOnScreen(page), [SECOND.id]),
    `${label}: the course Soup keeps the soup only`,
  );
  check(
    same(await kept(page), { course: 'soup' }),
    `${label}: the course is kept in culina.dishes`,
  );
  await course(page).selectOption('');
  await settle(page);
  const characters = await character(page).locator('option').allInnerTexts();
  check(
    characters.includes('Fried') && characters.includes('Uncooked'),
    `${label}: the character filter offers what the dishes are like (${characters.join(', ')})`,
  );
  await character(page).selectOption({ label: 'Fried' });
  await settle(page);
  check(same(await idsOnScreen(page), [OWN.id]), `${label}: Fried keeps the fried own dish only`);
  await character(page).selectOption({ label: 'Uncooked' });
  await settle(page);
  check(
    same(await idsOnScreen(page), [PAN.id, SECOND.id]),
    `${label}: Uncooked keeps the two classics, by name (${await idsOnScreen(page)})`,
  );
  const uncookedMeta = await page.locator(`${ROWS} .entry-meta`).allInnerTexts();
  check(
    uncookedMeta.length === 2 &&
      uncookedMeta.every((m) => !m.includes('Shipped') && !m.includes('My dish')),
    `${label}: with one origin left the origin word is not repeated (${uncookedMeta.join(' | ')})`,
  );
  await character(page).selectOption('');
  await cuisine(page).selectOption('it');
  await settle(page);
  check(same(await idsOnScreen(page), [SECOND.id]), `${label}: Italy keeps the Italian dish only`);
  await cuisine(page).selectOption('');
  await originSelect(page).selectOption('own');
  await settle(page);
  check(same(await idsOnScreen(page), [OWN.id]), `${label}: "My dishes" keeps the own dish only`);
  await originSelect(page).selectOption('');
  await meatFree(page).check();
  await settle(page);
  const free = await idsOnScreen(page);
  check(
    free.includes(PAN.id) && !free.includes(SECOND.id),
    `${label}: "Without meat and fish" drops the classic with meat (${free.join(', ')})`,
  );
  await meatFree(page).uncheck();
  await settle(page);

  // Kept across a reload.
  await open(page, origin, 'cook');
  await page.locator('.dish-row').first().waitFor();
  check(
    (await have(page).isChecked()) && same([...(await keysOnScreen(page))].sort(), want),
    `${label}: the switch and its list come back after a reload`,
  );
  await have(page).uncheck();
  await settle(page);
  check((await keysOnScreen(page)).length === every, `${label}: off again, every dish is there`);
  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

const lackingFlow = async (browser, origin, width) => {
  const label = `${width}px a dish that lacks something`;
  const { context, page, problems } = await fresh(browser, origin, width, [BUTTER]);

  // The pan dish lacks two lines on butter alone: with the switch on it is not there, off it is.
  await have(page).check();
  await settle(page);
  check(
    !(await idsOnScreen(page)).includes(PAN.id) &&
      same([...(await keysOnScreen(page))].sort(), readyKeys([BUTTER])),
    `${label}: with the switch on, a dish that lacks something is left out (${await keysOnScreen(page)})`,
  );
  await have(page).uncheck();
  await settle(page);
  check(
    (await idsOnScreen(page)).includes(PAN.id),
    `${label}: with the switch off it is in the list`,
  );

  // An entry opens the dish view.
  await page.locator(`${ROWS}[data-key="shipped:${PAN.id}"] a`).click();
  await page.getByRole('heading', { level: 1, name: PAN.name.en, exact: true }).waitFor();
  check(
    new URL(page.url()).hash === `#/classic/${PAN.id}`,
    `${label}: the entry opens #/classic/${PAN.id}`,
  );

  // The dish view in its order: name, course, portions, ingredients, button, method, then the closed blocks (goes with, nutrition, source).
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
      pairing: top(heading('Goes with')),
      nutrition: top(heading('Nutrition per portion')),
      source: top(heading('Source')),
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
    'pairing',
    'nutrition',
    'source',
  ];
  const present = order.filter((k) => tops[k] !== null && tops[k] !== undefined);
  check(
    present.length >= 8 && present.every((k, i) => i === 0 || tops[k] > tops[present[i - 1]]),
    `${label}: name, portions, ingredients, button, method, then goes with, nutrition and source (${present.map((k) => `${k}:${Math.round(tops[k])}`).join(' ')})`,
  );
  check(
    tops.blocks === 3 && tops.open.every((o) => o === false),
    `${label}: goes with, nutrition and source are each closed behind a tap (what we settled and the second check have no disclosure of their own)`,
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

/**
 * "Use up first" on Cook: the dishes, own and shipped, that use a dated stock item come first in
 * the engine's one ranking (`rankCandidates`, the nearest use-by first; at the finder's wide
 * threshold, so whether every line is there does not matter), the rest follow by name, and the row
 * says which item sets its place. The old address #/cook/use-up sets this order.
 */
const useUpFlow = async (browser, origin, width) => {
  const label = `${width}px use up first`;
  const all = [BUTTER, OIL, SALT];
  DETAIL = { [OIL]: { useBy: '2026-11-19' } };
  const { context, page, problems } = await fresh(browser, origin, width, all, [OWN]);
  const order = page.getByLabel('Order', { exact: true });
  check((await order.inputValue()) === 'name', `${label}: the list is by name at first`);
  await order.selectOption({ label: 'Use up first' });
  await settle(page);
  const urgent = engine
    .rankCandidates([...expectedOwn(all, 1000, [OWN]), ...expectedClassics(all, 1000)])
    .filter((c) => c.urgency !== undefined)
    .map((c) => `${c.kind === 'classic' ? 'shipped' : 'own'}:${c.id}`);
  const shown = await keysOnScreen(page);
  const rest = shown.slice(urgent.length);
  const restNames = (await namesOnScreen(page)).slice(urgent.length);
  check(
    urgent.length >= 1 &&
      urgent.length < shown.length &&
      same(shown.slice(0, urgent.length), urgent) &&
      same(
        restNames,
        [...restNames].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
      ),
    `${label}: what uses the oil first, in the engine's ranking, then the rest by name (${shown.join(', ')}; urgent ${urgent.join(', ')}; rest ${rest.join(', ')})`,
  );
  const meta = await page.locator(`${ROWS}[data-key="${urgent[0]}"] .entry-meta`).innerText();
  check(
    meta.includes('uses the Oil, olive with 1 day left'),
    `${label}: the row says which item sets its place (${meta})`,
  );
  check(
    (await page.evaluate(() => localStorage.getItem('culina.cookList'))) ===
      JSON.stringify({ have: false, order: 'use-up' }),
    `${label}: the order is kept in culina.cookList`,
  );
  await layout(page, `${label} list`);
  // The old address sets the order and is replaced by #/cook.
  await order.selectOption({ label: 'By name' });
  await open(page, origin, 'cook/use-up');
  await page.locator('.dish-row').first().waitFor();
  check(
    new URL(page.url()).hash === '#/cook' &&
      (await order.inputValue()) === 'use-up' &&
      same((await keysOnScreen(page)).slice(0, urgent.length), urgent),
    `${label}: #/cook/use-up is Cook in the order "Use up first" (${new URL(page.url()).hash})`,
  );
  DETAIL = {};
  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

export const classicsFinder = async (browser, server) => {
  await useUpFlow(browser, server.origin, 360);
  await flow(browser, server.origin, 360);
  await flow(browser, server.origin, 1000);
  await lackingFlow(browser, server.origin, 360);
  await lackingFlow(browser, server.origin, 1000);
};
