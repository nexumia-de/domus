// Cook and the finder from one ingredient in a browser, on the fixture notebook and stock with a
// fixed date (docs/decisions/cook-screen.md). Cook is the one list: "Only with what I have" keeps the
// own dishes the engine finds complete, "Use up first" puts the dish that uses the nearest use-by
// first and says the item, with nothing ticked the switch offers the way to tick, with no dated
// item the order says so, the stock is one tap away and leads back, the injected clock moves the
// days. "What uses <ingredient>" (#/cook/<id>/with, started on Cook, also by a German name) is the
// engine's ranking of what uses it, every entry with its reason, the finder's own two choices that
// survive a reload, an old country or meat choice that narrows nothing, the empty states with the
// nearest. 360 px without horizontal scroll, 1000 px, no console error or foreign request, offline.
// The shipped dishes under the switch and the order are checked with fictional content in
// classics-finder.mjs; here only the own entries are compared. Not proved here: a real device's
// clock, the real 48 shipped dishes against the engine.
import { check, watch } from './harness.mjs';
import { layout } from './editor-helpers.mjs';
import { FORBIDDEN, overflow } from './measure.mjs';
import { controlled } from './smoke.mjs';
import { data, input, itemName, keys, NOW, ranked, store, usesKeys } from './cook-fixture.mjs';
import { engine } from './notebook-fixture.mjs';

const label = '360px cook';
const WITH = 'cook/cook-leek/with';
const open = async (page, origin, hash, now = NOW) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store&e2e-now=${now}#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};
const fresh = async (browser, origin, width = 360, only) => {
  const context = await browser.newContext({
    viewport: { width, height: width < 720 ? 720 : 700 },
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, 'cook');
  await store(page, only);
  return { context, page, problems };
};
const reopen = async (page, origin, hash, now) => {
  await open(page, origin, hash, now);
};
const OWN = '.cook-list > li[data-origin="own"]';
const onScreen = (page) =>
  page.locator(OWN).evaluateAll((items) => items.map((li) => li.dataset.key));
/** The engine's list as the screen groups it: dishes first, then components and ratio cards. */
const grouped = (list) => [
  ...list.filter((c) => c.kind === 'dish'),
  ...list.filter((c) => c.kind !== 'dish'),
];
/** What uses an ingredient, as the engine ranks it at a threshold. */
const usesOf = (ingredientId, maxMissing, today) => {
  const uses = usesKeys(ingredientId, maxMissing);
  return ranked(maxMissing, today).candidates.filter((c) => uses.has(`${c.kind}:${c.id}`));
};
const text = (page, selector) => page.locator(selector).allInnerTexts();
const noFieldFocused = (page) =>
  page.evaluate(
    () => !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? ''),
  );
const stored = (page) => page.evaluate(() => localStorage.getItem('culina.cook'));
const lackingSelect = (page) => page.getByLabel('Show', { exact: true });
const roleSelect = (page) => page.getByLabel('Covers the role');
const have = (page) => page.getByLabel('Only with what I have');
const order = (page) => page.getByLabel('Order', { exact: true });
const rowKeys = (page) =>
  page.locator('.dish-rows-list > li').evaluateAll((items) => items.map((li) => li.dataset.key));
const daysPhrase = (days) =>
  days < 0
    ? 'past use by'
    : days === 0
      ? 'use by today'
      : `${days} day${days === 1 ? '' : 's'} left`;
/** Only the own dishes on Cook: the shipped ones are compared in classics-finder.mjs. */
const mineOnly = (page) =>
  page.evaluate(() => localStorage.setItem('culina.dishes', JSON.stringify({ origin: 'own' })));

/** Cook: the one list with its switch, its order and the way to the stock. */
const cookList = async (browser, origin) => {
  const where = `${label} list`;
  const { context, page, problems } = await fresh(browser, origin);
  await mineOnly(page);
  await reopen(page, origin, 'cook');
  await page.locator('.dish-row').first().waitFor();
  check(await noFieldFocused(page), `${where}: no field is focused when Cook opens`);
  check(
    (await page.locator('.section-tabs, .cook-tab').count()) === 0 &&
      !(await have(page).isChecked()) &&
      (await order(page).inputValue()) === 'name',
    `${where}: one screen, no views; every dish, by name, at first`,
  );
  // "Only with what I have": the own dishes the engine finds complete at threshold 0.
  await have(page).check();
  const ready = ranked(0).candidates.filter((c) => c.kind === 'dish' && c.complete);
  check(
    ready.length >= 1 &&
      JSON.stringify(await rowKeys(page)) === JSON.stringify(ready.map((c) => `own:${c.id}`)),
    `${where}: "Only with what I have" keeps the dishes the engine finds complete (${await rowKeys(page)})`,
  );
  await have(page).uncheck();
  // "Use up first": the dish that uses the leek, one day before its use-by, says so.
  await order(page).selectOption({ label: 'Use up first' });
  const soup = ranked(1000).candidates.find((c) => c.id === 'cook-soup-plate');
  const meta = await page
    .locator('.dish-row', { hasText: 'Soup plate' })
    .locator('.entry-meta')
    .innerText();
  check(
    soup.urgency !== undefined &&
      meta.includes(
        `uses the ${itemName(soup.urgency.itemId)} with ${soup.urgency.daysLeft} day${soup.urgency.daysLeft === 1 ? '' : 's'} left`,
      ),
    `${where}: "Use up first" names the item that sets the place, as the engine (${meta})`,
  );
  const wording = (await page.locator('main').innerText()).match(FORBIDDEN);
  check(wording === null, `${where}: the wording never judges ${wording ?? ''}`);
  await layout(page, `${where} (use up first)`);
  // Two days later the leek is past its use-by: plain words.
  await reopen(page, origin, 'cook', '2026-11-20T08:00:00Z');
  await page.locator('.dish-row').first().waitFor();
  const later = await page
    .locator('.dish-row', { hasText: 'Soup plate' })
    .locator('.entry-meta')
    .innerText();
  check(
    later.includes('uses the Leek, past use by'),
    `${where}: the injected clock moves the days; a passed date is plain words (${later})`,
  );
  // The stock is one tap away and leads back.
  await page.getByRole('link', { name: 'What is there', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'What is there' }).waitFor();
  check(
    page.url().endsWith('#/stock') &&
      (await page.getByRole('link', { name: 'Tick what is there' }).count()) === 1 &&
      (await page.locator('nav [aria-current="page"]').innerText()).trim() === 'Cook',
    `${where}: the stock is its own screen under Cook, with its tick action`,
  );
  await page.getByRole('link', { name: 'Back to Cook' }).click();
  await page.getByRole('heading', { level: 1, name: 'Cook', exact: true }).waitFor();
  check(page.url().endsWith('#/cook'), `${where}: the stock leads back to Cook`);
  await context.close();

  // Nothing ticked: the switch offers the way to tick; no dated item: the order says so.
  const empty = await fresh(browser, origin, 360, { stock: [] });
  await mineOnly(empty.page);
  await empty.page.evaluate(() =>
    localStorage.setItem('culina.cookList', JSON.stringify({ have: true, order: 'use-up' })),
  );
  await reopen(empty.page, origin, 'cook');
  await empty.page.locator('.cook-list-note .cook-empty').waitFor();
  check(
    (await text(empty.page, '.cook-list-note .cook-empty .empty'))[0].startsWith(
      'Nothing is ticked yet',
    ) &&
      (await empty.page.locator('.cook-list-note a').getAttribute('href')) === '#/stock/add' &&
      (await empty.page.locator('.dish-row').count()) === 0,
    `${where}: with nothing ticked, "Only with what I have" invites ticking`,
  );
  check(
    (await text(empty.page, '.cook-no-dates'))[0] ===
      'No item has a use-by date yet. A date can be added on the item.',
    `${where}: with no dated item, "Use up first" says so`,
  );
  await layout(empty.page, `${where} (nothing ticked)`);
  await empty.context.close();
  return [...problems, ...empty.problems];
};

/** What uses the leek: the engine's ranking of what uses it, each entry with its reason. */
const ordering = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await reopen(page, origin, WITH);
  const expected = usesOf('cook-leek', 1);
  check(await noFieldFocused(page), `${label}: no field is focused when the finder opens`);
  check(
    (await text(page, '.cook-asof'))[0] === 'As of 18 Nov 2026',
    `${label}: the date used for the ranking is shown`,
  );
  check(
    (await page.locator('.section-tabs, .cook-tab').count()) === 0,
    `${label}: the finder has no parts and no views at the top`,
  );
  const shown = await onScreen(page);
  check(
    expected.length >= 4 && JSON.stringify(shown) === JSON.stringify(keys(grouped(expected))),
    `${label}: the order on screen is the engine's (${shown.length} entries: ${shown.join(', ')})`,
  );
  const groups = await page.locator('.cook-group-heading').allInnerTexts();
  check(
    JSON.stringify(groups) === JSON.stringify(['Dishes', 'Components and ratios']) &&
      (await page.locator('.cook-dishes li[data-kind="component"]').count()) === 0 &&
      (await page.locator('.cook-parts li[data-kind="dish"]').count()) === 0,
    `${label}: dishes in one group, components in a second (${groups.join(', ')})`,
  );
  const reasons = await text(page, `${OWN} .cook-reason`);
  check(
    reasons.length === shown.length && reasons.every((r) => r.trim().length > 0),
    `${label}: every entry shows why it is ranked there`,
  );
  const statuses = await text(page, `${OWN} .cook-status`);
  check(
    JSON.stringify(statuses) ===
      JSON.stringify(
        grouped(expected).map((c) => (c.complete ? 'complete' : `lacks ${c.lacking}`)),
      ),
    `${label}: "complete" or "lacks N" beside each entry, as the engine counts`,
  );
  // The reason names the item that sets the urgency and its days left, from the engine.
  const urgent = expected.filter((c) => c.urgency);
  const reasonOf = (id) => page.locator(`.cook-list li[data-id="${id}"] .cook-reason`).innerText();
  let reasonsOk = urgent.length >= 2;
  for (const c of urgent) {
    const want = `uses the ${itemName(c.urgency.itemId)}`;
    const days = daysPhrase(c.urgency.daysLeft);
    const got = await reasonOf(c.id);
    reasonsOk &&= got.startsWith(want) && (got.includes(days) || c.urgency.daysLeft <= 0);
  }
  check(reasonsOk, `${label}: the reason names the item with the nearest use-by and its days left`);
  const none = expected.find((c) => !c.urgency && c.kind === 'component');
  check(
    (await reasonOf(none.id)).startsWith('nothing it uses has a use-by date'),
    `${label}: an entry with no dated item says so`,
  );
  const li = (id) => page.locator(`.cook-list li[data-id="${id}"]`);
  const soup = expected.find((c) => c.id === 'cook-potato-leek-soup');
  check(
    soup.complete &&
      (await li('cook-potato-leek-soup').innerText()).includes(
        'Cream is there; how much is not known.',
      ),
    `${label}: a stock item without an amount is flagged, the dish still complete`,
  );
  check(
    (await li('cook-buttered-leeks').innerText()).includes(
      'with Salted butter in place of Unsalted butter',
    ),
    `${label}: a substitute is named`,
  );
  const tart = (await li('cook-onion-tart-2').innerText()).replace(/\s+/g, ' ');
  check(
    tart.includes('lacks 1') &&
      tart.includes('Lacks: Thyme') &&
      (await page.locator('.cook-list li[data-id="cook-onion-tart-1"]').count()) === 0,
    `${label}: a recipe that lacks a line says which, and only the head version is listed`,
  );
  check(
    (await li('cook-soup-plate').innerText()).includes('You could add a crunch: Walnut') &&
      !(await li('cook-soup-plate').innerText()).includes('You could add a garnish'),
    `${label}: an open role of a dish is offered only where the stock has something for it`,
  );
  const salt = ranked(1).candidates.filter((c) => c.usedItems.includes('cook-salt'));
  check(salt.length === 0, `${label}: an always-there item is never named as what is used`);
  const wording = (await page.locator('main').innerText()).match(FORBIDDEN);
  check(wording === null, `${label}: the wording never judges ${wording ?? ''}`);
  await layout(page, `${label} (what uses Leek)`);

  // Tapping an entry opens the recipe.
  await li('cook-onion-tart-2').getByRole('link').click();
  await page.getByRole('heading', { level: 1, name: 'Onion tart' }).waitFor();
  check(
    page.url().endsWith('#/components/cook-onion-tart-2'),
    `${label}: an entry opens its recipe`,
  );
  await page.goBack();
  await page.locator('.cook-list').first().waitFor();
  const dishHref = await li('cook-soup-plate').getByRole('link').getAttribute('href');
  check(dishHref === '#/dishes/cook-soup-plate', `${label}: a dish opens the dish`);
  await context.close();
  return problems;
};

const filters = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await reopen(page, origin, WITH);
  check(
    (await lackingSelect(page).inputValue()) === '1' &&
      (await roleSelect(page).inputValue()) === '',
    `${label}: the filters start at "lacking at most 1" and any role`,
  );
  await lackingSelect(page).selectOption({ label: 'Complete only' });
  const complete = usesOf('cook-leek', 0);
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(complete))) &&
      (await text(page, `${OWN} .cook-status`)).every((s) => s === 'complete'),
    `${label}: "complete only" is the engine's threshold 0, in the engine's order`,
  );
  const options = await roleSelect(page).locator('option').allInnerTexts();
  check(
    options[0] === 'Any role' && options.includes('Main element'),
    `${label}: the role filter offers the roles that can be covered (${options.join(', ')})`,
  );
  await roleSelect(page).selectOption({ label: 'Main element' });
  const main = complete.filter((c) => c.roles.includes('main'));
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(main))),
    `${label}: a role keeps only what covers it, order unchanged (${main.length} of ${complete.length})`,
  );
  check(
    (await stored(page)) === JSON.stringify({ role: 'main', lacking: 0 }),
    `${label}: the choice is kept in the preferences`,
  );
  await page.reload();
  await page.locator('.cook-choices').first().waitFor();
  await page.waitForFunction(() => document.querySelector('.cook-results')?.childElementCount > 0);
  check(
    (await lackingSelect(page).inputValue()) === '0' &&
      (await roleSelect(page).inputValue()) === 'main' &&
      JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(main))),
    `${label}: the filters survive a reload`,
  );
  await layout(page, `${label} (filtered)`);
  await lackingSelect(page).selectOption({ label: 'Lacking at most 3' });
  const wide = usesOf('cook-leek', 3).filter((c) => c.roles.includes('main'));
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(wide))),
    `${label}: "lacking at most 3" is the engine's threshold 3`,
  );
  await context.close();
  return problems;
};

const start = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await reopen(page, origin, 'cook');
  await page.locator('.cook-start summary').click();
  const fromStock = await text(page, '.cook-start .cook-picks .cook-pick');
  check(
    fromStock.includes('Leek') && !fromStock.includes('Garlic'),
    `${label}: the ingredients that are there can be picked on Cook (${fromStock.join(', ')})`,
  );
  await layout(page, `${label} (start open)`);
  await page.getByRole('link', { name: 'Leek', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'What uses Leek' }).waitFor();
  check(
    page.url().endsWith('#/cook/cook-leek/with') &&
      (await page.locator('nav [aria-current="page"]').innerText()).trim() === 'Cook',
    `${label}: "what uses the leeks" is #/cook/<id>/with, under Cook`,
  );
  const expected = usesOf('cook-leek', 1);
  const shown = await onScreen(page);
  check(
    expected.length >= 4 && JSON.stringify(shown) === JSON.stringify(keys(grouped(expected))),
    `${label}: only what uses the leeks or one that can stand in for them, in the engine's order (${shown.length})`,
  );
  check(
    !shown.includes('component:cook-walnut-butter') &&
      shown.includes('component:cook-onion-tart-2'),
    `${label}: a recipe without any allium is left out, one with an onion (a sibling) is in`,
  );
  check(
    (await page.getByRole('link', { name: 'Show everything' }).count()) === 1 &&
      (await page.locator('main').innerText()).includes('Only your own components and dishes'),
    `${label}: the start is explained and can be left`,
  );
  await layout(page, `${label} (from one ingredient)`);
  // By search, through the German name and an alias.
  await page.getByRole('link', { name: 'Show everything' }).click();
  await page.getByRole('heading', { level: 1, name: 'Cook', exact: true }).waitFor();
  check(page.url().endsWith('#/cook'), `${label}: "Show everything" is Cook again`);
  await page.locator('.cook-start summary').click();
  const search = page.getByLabel('Search your ingredients');
  await search.fill('zwiebel');
  const hit = page.locator('.cook-found .cook-pick');
  await hit.first().waitFor();
  check(
    (await hit.allInnerTexts()).join('|').replace(/\s+/g, ' ').startsWith('Onion'),
    `${label}: the search finds an ingredient by its German name`,
  );
  await search.fill('porree');
  await hit.first().waitFor();
  check(
    (await hit.first().innerText()).replace(/\s+/g, ' ').includes('Leek'),
    `${label}: the search finds an ingredient by a German alias and says what it found`,
  );
  await search.fill('nothing like this');
  await page.getByText('No ingredient of yours has that name.').waitFor();
  await search.fill('Joghurt');
  await hit.first().click();
  await page.getByRole('heading', { level: 1, name: 'What uses Yoghurt' }).waitFor();
  check(
    (await page.locator('.cook-list').count()) > 0 !==
      (await page.locator('.cook-empty').count()) > 0,
    `${label}: an ingredient nothing uses has an empty state, not a broken list`,
  );
  await context.close();
  return problems;
};

const empties = async (browser, origin) => {
  // Nothing ticked: the way to tick.
  let { context, page } = await fresh(browser, origin, 360, { stock: [] });
  await reopen(page, origin, WITH);
  check(
    (await text(page, '.cook-empty .empty'))[0].startsWith('Nothing is ticked yet') &&
      (await page.getByRole('link', { name: 'Tick what is there' }).last().getAttribute('href')) ===
        '#/stock/add',
    `${label}: nothing ticked invites ticking, with the link`,
  );
  await layout(page, `${label} (nothing ticked)`);
  await context.close();

  // Something ticked, nothing of one's own written yet.
  const little = data.stock.filter((s) => ['cook-salt', 'cook-onion'].includes(s.id));
  ({ context, page } = await fresh(browser, origin, 360, {
    stock: little,
    components: [],
    dishes: [],
  }));
  await reopen(page, origin, 'cook/cook-onion/with');
  const hrefs = await page
    .locator('.cook-empty a')
    .evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  check(
    (await text(page, '.cook-empty .empty'))[0] ===
      'Your notebook has no components or dishes yet.' &&
      hrefs.join() === '#/components/new,#/settings/import',
    `${label}: an empty notebook invites adding a component or importing (${hrefs.join(' ')})`,
  );
  await layout(page, `${label} (nothing in the notebook)`);
  await context.close();

  // Nothing matches: the nearest are named with what they lack.
  ({ context, page } = await fresh(browser, origin, 360, { stock: little }));
  await reopen(page, origin, 'cook/cook-onion/with');
  await lackingSelect(page).selectOption({ label: 'Complete only' });
  await page.locator('.cook-nearest').waitFor();
  const nearest = await text(page, '.cook-nearest .entry-name');
  const uses = usesKeys('cook-onion', 1000);
  const wide = engine.makeable(input(1000, data.today, little));
  const want = wide.candidates
    .filter((c) => c.lacking > 0 && uses.has(`${c.kind}:${c.id}`))
    .sort((a, b) => a.lacking - b.lacking)
    .slice(0, 3);
  check(
    (await text(page, '.cook-empty .empty'))[0].startsWith('Nothing matches these choices.') &&
      nearest.length === want.length &&
      nearest.includes('Onion tart lacks Thyme') &&
      nearest[0] ===
        `${want[0].name} lacks ${want[0].lines
          .filter((l) => l.status === 'missing')
          .map((l) => (l.ref ? data.ingredients.find((i) => i.id === l.ref.id)?.name : ''))
          .join(', ')}`,
    `${label}: nothing matching names the nearest and what they lack (${nearest.join('; ')})`,
  );
  await layout(page, `${label} (nothing matches)`);
  await context.close();
};

const clock = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  const later = '2026-11-20T08:00:00Z';
  await reopen(page, origin, WITH, later);
  const expected = usesOf('cook-leek', 1, '2026-11-20');
  check(
    (await text(page, '.cook-asof'))[0] === 'As of 20 Nov 2026' &&
      JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(expected))),
    `${label}: the date comes from the injected clock; two days later the engine's order is shown`,
  );
  const soup = await page
    .locator('.cook-list li[data-id="cook-potato-leek-soup"] .cook-reason')
    .innerText();
  check(
    soup.startsWith('uses the Leek, past use by'),
    `${label}: a date that has passed is plain words (${soup})`,
  );
  await context.close();
  return problems;
};

const desktop = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin, 1000);
  for (const hash of ['cook', WITH, 'stock']) {
    await reopen(page, origin, hash);
    const o = await overflow(page);
    await layout(page, `1000px #/${hash}`);
    check(o.scroll <= 0, `1000px #/${hash}: no horizontal scroll`);
  }
  await reopen(page, origin, WITH);
  check(
    (await page.locator(OWN).count()) === usesOf('cook-leek', 1).length,
    '1000px: the finder lists what the engine ranks',
  );
  await context.close();
  return problems;
};

const offline = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?e2e-store&e2e-now=${NOW}#/${WITH}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await store(page);
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.cook-list').first().waitFor();
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(usesOf('cook-leek', 1)))),
    `${label}: offline, the finder shows the same ranking`,
  );
  await page.goto(`${origin}/?e2e-now=${NOW}#/cook/use-up`);
  await page.locator('.dish-row').first().waitFor();
  check(
    page.url().endsWith('#/cook') && (await order(page).inputValue()) === 'use-up',
    `${label}: offline, the old address of use up first opens Cook in that order`,
  );
  await context.close();
  return problems;
};

/**
 * A dish filter chosen on Cook: on "What uses <ingredient>" it does not narrow; on Cook, where it
 * and "Only with what I have" hide everything, "Show all" empties both.
 */
const chosenElsewhere = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await page.evaluate(() =>
    localStorage.setItem('culina.dishes', JSON.stringify({ course: 'main' })),
  );
  await reopen(page, origin, WITH);
  const expected = usesOf('cook-leek', 1);
  check(
    expected.length >= 4 &&
      JSON.stringify(await onScreen(page)) === JSON.stringify(keys(grouped(expected))) &&
      (await page.locator('.dish-filter').count()) === 0,
    `${label}: a course chosen on Cook does not narrow "What uses Leek", and its controls are not there`,
  );
  await layout(page, `${label} (uses, with a dish filter kept)`);
  await page.evaluate(() => {
    localStorage.setItem('culina.dishes', JSON.stringify({ origin: 'own', cuisine: 'it' }));
    localStorage.setItem('culina.cookList', JSON.stringify({ have: true, order: 'name' }));
  });
  await reopen(page, origin, 'cook');
  await page.locator('.dish-show-all').waitFor();
  check(
    (await text(page, '.dish-rows .empty'))[0] === 'No dish fits these choices.',
    `${label}: Cook says quietly that nothing fits`,
  );
  await layout(page, `${label} (nothing fits on Cook)`);
  await page.locator('.dish-show-all').click();
  await page.locator('.dish-row').first().waitFor();
  check(
    (await page.evaluate(() => localStorage.getItem('culina.dishes'))) === '{}' &&
      (await page.evaluate(() => localStorage.getItem('culina.cookList'))) ===
        JSON.stringify({ have: false, order: 'name' }) &&
      !(await have(page).isChecked()),
    `${label}: "Show all" empties the dish filter and lets go of "Only with what I have"`,
  );
  await context.close();
  return problems;
};

/** An old entry with the classics' country and meat choice changes nothing and stops nothing. */
const oldEntry = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await page.evaluate(() => {
    localStorage.setItem(
      'culina.cook',
      JSON.stringify({ role: 'main', lacking: 2, country: 'it', meatFree: true }),
    );
    localStorage.removeItem('culina.dishes');
  });
  for (const hash of ['cook', 'cook/use-up', WITH]) await reopen(page, origin, hash);
  const kept = () =>
    page.evaluate(() => ({
      cook: localStorage.getItem('culina.cook'),
      dishes: localStorage.getItem('culina.dishes'),
    }));
  const first = await kept();
  check(
    first.dishes === null && (await page.locator('.cook-parts').count()) === 1,
    `${label}: an old country and meat choice do not narrow anything: culina.dishes untouched (${first.dishes})`,
  );
  check(
    (await lackingSelect(page).inputValue()) === '2' &&
      (await roleSelect(page).inputValue()) === 'main',
    `${label}: the old entry's role and threshold are still read`,
  );
  // The next time the finder's own choices are written, the old fields fall away.
  await lackingSelect(page).selectOption('1');
  check(
    (await kept()).cook === JSON.stringify({ role: 'main', lacking: 1 }),
    `${label}: the old fields fall away when the entry is written (${(await kept()).cook})`,
  );
  await page.evaluate(() => localStorage.setItem('culina.cook', '{"lacking":'));
  await reopen(page, origin, WITH);
  check(
    (await lackingSelect(page).inputValue()) === '1',
    `${label}: a broken old entry is the default, not a stumble`,
  );
  await reopen(page, origin, 'cook');
  await page.locator('.dish-row').first().waitFor();
  await page.locator('details.dish-filter-fold summary').click();
  check(
    !(await page.locator('.dish-filter-meat-free input').isChecked()),
    `${label}: on Cook the old meat choice is not ticked`,
  );
  await context.close();
  return problems;
};

export const cook = async (browser, server) => {
  const origin = server.origin;
  const problems = [
    ...(await cookList(browser, origin)),
    ...(await ordering(browser, origin)),
    ...(await filters(browser, origin)),
    ...(await start(browser, origin)),
    ...(await clock(browser, origin)),
    ...(await desktop(browser, origin)),
    ...(await offline(browser, origin)),
    ...(await oldEntry(browser, origin)),
    ...(await chosenElsewhere(browser, origin)),
  ];
  await empties(browser, origin);
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
};
