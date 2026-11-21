// The shipped dishes in "What can I cook", in a browser, on the fictional example dishes and one
// own dish written here: own and shipped dishes are ONE list in the engine's one ranking
// (`rankCandidates` over `makeable` and `classicsMakeable`), each with a quiet origin word; the one
// dish filter (course, character, cuisine, origin, without meat and fish) narrows it and is the
// stored filter the Dishes list reads (`culina.dishes`), in both directions; a line the catalogue
// lacks is named apart; what lacks is "Lacks"; an entry opens its dish view, and the dish view shows
// the ingredients before the source. At 360 x 720 and at desktop size: no horizontal scroll,
// targets of at least 44 x 44, no console error. Not proved here: German, a real phone.
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
const stockOf = (ids) => ids.map((id) => ({ id, ref: { kind: 'ingredient', id } }));
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
    ids.map((id) => ({ ref: { kind: 'ingredient', id } })),
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
/** The one list as specified: both ranked again as one by the engine. */
const expectedKeys = (ids, maxMissing, dishes = []) =>
  engine
    .rankCandidates([...expectedOwn(ids, maxMissing, dishes), ...expectedClassics(ids, maxMissing)])
    .map((c) => `${c.kind === 'classic' ? 'classic' : 'dish'}:${c.id}`);
const keysOnScreen = (page) =>
  page
    .locator('.cook-dishes .cook-entry')
    .evaluateAll((items) => items.map((li) => li.dataset.key));
const idsOnScreen = (page) =>
  page.locator('.cook-dishes .cook-entry').evaluateAll((items) => items.map((li) => li.dataset.id));
const fresh = async (browser, origin, width, ids, dishes = []) => {
  const context = await browser.newContext({
    viewport: { width, height: width < 720 ? 720 : 700 },
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, 'cook');
  await store(page, ids, dishes);
  await open(page, origin, 'cook');
  await page.locator('.cook-dishes').waitFor();
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
const lacking = (page) => page.getByLabel('Show', { exact: true });
const kept = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('culina.dishes') ?? '{}'));
const settle = (page) => page.waitForTimeout(150);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const flow = async (browser, origin, width) => {
  const label = `${width}px one list in the finder`;
  const all = [BUTTER, OIL, SALT];
  const { context, page, problems } = await fresh(browser, origin, width, all, [OWN]);

  // One list, in the engine's one ranking, with the origin said quietly.
  const want = expectedKeys(all, 1, [OWN]);
  const shown = await keysOnScreen(page);
  check(
    want.length === 3 && want.includes(`dish:${OWN.id}`) && same(shown, want),
    `${label}: own and shipped dishes in one list, in the engine's one ranking (${shown.join(', ')} / ${want.join(', ')})`,
  );
  check(
    (await page.getByRole('heading', { name: 'Classic dishes' }).count()) === 0 &&
      (await page.getByRole('heading', { level: 2, name: 'Dishes', exact: true }).count()) === 1,
    `${label}: no separate section for the classics, one "Dishes" group`,
  );
  const kinds = await page.locator('.cook-dishes .cook-kind').allInnerTexts();
  check(
    kinds.some((k) => k.startsWith('mine')) && kinds.some((k) => k.startsWith('shipped')),
    `${label}: each entry says its origin quietly where both are in the list (${kinds.join(' | ')})`,
  );
  const classicsAll = expectedClassics(all, 1);
  const statuses = await page
    .locator('.cook-dishes .cook-entry[data-origin="shipped"] .cook-status')
    .allInnerTexts();
  check(
    same(
      statuses,
      engine
        .rankCandidates(classicsAll)
        .map((c) => (c.complete ? 'complete' : `lacks ${c.lacking}`)),
    ),
    `${label}: "complete" or "lacks N" as the engine counts (${statuses.join(', ')})`,
  );
  const secondRow = (await page.locator(`.cook-entry[data-id="${SECOND.id}"]`).innerText()).replace(
    /\s+/g,
    ' ',
  );
  check(
    secondRow.includes('Not in the catalogue yet, so not counted: Example broth stock') &&
      secondRow.includes('complete'),
    `${label}: a line the catalogue lacks is named apart and not counted (${secondRow})`,
  );
  check(
    (await page.locator('.cook-dishes .cook-lacks').count()) === 0,
    `${label}: a complete dish names nothing it lacks`,
  );
  await layout(page, `${label} list`);

  // A course narrows the list; the choice is the stored dish filter.
  await course(page).selectOption('soup');
  await settle(page);
  check(
    same(await idsOnScreen(page), [SECOND.id]),
    `${label}: the course Soup keeps the soup only`,
  );
  check(
    same(await kept(page), { course: 'soup' }),
    `${label}: the course is kept in culina.dishes, the filter the Dishes list reads`,
  );
  check(
    (await page.locator('.cook-parts').count()) === 0,
    `${label}: with a dish filter chosen, components and ratio cards are left out`,
  );
  await course(page).selectOption('');
  await settle(page);

  // A character narrows the list: the own dish is fried, the classics are not.
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
    same(
      await idsOnScreen(page),
      want.filter((k) => k.startsWith('classic:')).map((k) => k.slice('classic:'.length)),
    ),
    `${label}: Uncooked keeps the two classics, in the same order`,
  );
  check(
    (await page.locator('.cook-dishes .cook-kind').allInnerTexts()).every(
      (k) => !k.startsWith('shipped') && !k.startsWith('mine'),
    ),
    `${label}: with one origin left the origin word is not repeated`,
  );
  await character(page).selectOption('');
  await settle(page);

  // Cuisine, origin and "without meat and fish" only drop entries.
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
  // Nothing fits: said quietly, under the same choices.
  await course(page).selectOption('soup');
  await settle(page);
  check(
    (await keysOnScreen(page)).length === 0 &&
      (await page.locator('.cook-empty .empty').first().innerText()) ===
        'Nothing matches these choices.',
    `${label}: a filter nothing fits says so quietly`,
  );
  check(
    same(await kept(page), { meatFree: true, course: 'soup' }),
    `${label}: both choices are kept in culina.dishes (${JSON.stringify(await kept(page))})`,
  );
  await open(page, origin, 'cook');
  await page.locator('.cook-empty').waitFor();
  check(
    (await course(page).inputValue()) === 'soup' && (await meatFree(page).isChecked()),
    `${label}: both choices come back after a reload`,
  );

  // The other direction: a filter stored by the Dishes list narrows the finder.
  await page.evaluate(() =>
    localStorage.setItem('culina.dishes', JSON.stringify({ origin: 'shipped', course: 'main' })),
  );
  await open(page, origin, 'cook');
  await page.locator('.cook-dishes').waitFor();
  check(
    same(await idsOnScreen(page), [PAN.id]) &&
      (await course(page).inputValue()) === 'main' &&
      (await originSelect(page).inputValue()) === 'shipped',
    `${label}: the filter stored under culina.dishes is the finder's own`,
  );
  await layout(page, `${label} filtered`);
  await page.evaluate(() => localStorage.removeItem('culina.dishes'));

  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

const lackingFlow = async (browser, origin, width) => {
  const label = `${width}px classics that lack something`;
  const { context, page, problems } = await fresh(browser, origin, width, [BUTTER]);

  // What lacks is said as "Lacks", neutrally; a classic beyond the threshold waits for a wider choice.
  const narrow = expectedKeys([BUTTER], 1);
  check(
    same(await keysOnScreen(page), narrow) && !narrow.includes(`classic:${PAN.id}`),
    `${label}: at most 1 lacking leaves out a classic that lacks 2 (${narrow.join(', ')})`,
  );
  await lacking(page).selectOption('2');
  await settle(page);
  const wide = expectedKeys([BUTTER], 2);
  check(
    same(await keysOnScreen(page), wide) && wide.includes(`classic:${PAN.id}`),
    `${label}: lacking at most 2 lists it`,
  );
  const panRow = (await page.locator(`.cook-entry[data-id="${PAN.id}"]`).innerText()).replace(
    /\s+/g,
    ' ',
  );
  check(
    /Lacks: [^;]+/.test(panRow) && panRow.includes('lacks 2'),
    `${label}: what it lacks is under "Lacks" (${panRow})`,
  );
  check(
    !/wrong|too much|falsch|zu viel|error/i.test(panRow),
    `${label}: the wording does not judge`,
  );

  // An entry opens the dish view.
  await page.locator(`.cook-entry[data-id="${PAN.id}"] a`).click();
  await page.getByRole('heading', { level: 1, name: PAN.name.en, exact: true }).waitFor();
  check(
    new URL(page.url()).hash === `#/classic/${PAN.id}`,
    `${label}: the entry opens #/classic/${PAN.id}`,
  );

  // The dish view in its order: name, course, portions, ingredients, button, method, then the closed blocks (nutrition, source).
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
    'nutrition',
    'source',
  ];
  const present = order.filter((k) => tops[k] !== null && tops[k] !== undefined);
  check(
    present.length >= 7 && present.every((k, i) => i === 0 || tops[k] > tops[present[i - 1]]),
    `${label}: name, portions, ingredients, button, method, then nutrition and source (${present.map((k) => `${k}:${Math.round(tops[k])}`).join(' ')})`,
  );
  check(
    tops.blocks === 2 && tops.open.every((o) => o === false),
    `${label}: nutrition and source are each closed behind a tap (what we settled and the second check have no disclosure of their own)`,
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
