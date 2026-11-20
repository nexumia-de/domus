// The finder in a browser, on the fixture notebook and stock with a fixed date: the order on screen
// equals the engine's ranking on the same data, every entry shows its reason, filters work and
// survive a reload, start from one ingredient (also by a German name), use up first, the empty
// states, 360 px without horizontal scroll, no console error or foreign request, offline.
import { check, watch } from './harness.mjs';
import { layout } from './editor-helpers.mjs';
import { FORBIDDEN, overflow } from './measure.mjs';
import { controlled } from './smoke.mjs';
import { data, input, itemName, keys, NOW, ranked, store, usesKeys } from './cook-fixture.mjs';
import { engine } from './notebook-fixture.mjs';

const label = '360px cook';
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
const onScreen = (page) =>
  page.locator('.cook-list > li').evaluateAll((items) => items.map((li) => li.dataset.key));
const text = (page, selector) => page.locator(selector).allInnerTexts();
const noFieldFocused = (page) =>
  page.evaluate(
    () => !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? ''),
  );
const stored = (page) => page.evaluate(() => localStorage.getItem('culina.cook'));
const lackingSelect = (page) => page.getByLabel('Show', { exact: true });
const roleSelect = (page) => page.getByLabel('Covers the role');
const daysPhrase = (days) =>
  days < 0
    ? 'past use by'
    : days === 0
      ? 'use by today'
      : `${days} day${days === 1 ? '' : 's'} left`;

const ordering = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await reopen(page, origin, 'cook');
  const engineRank = ranked(1);
  check(await noFieldFocused(page), `${label}: no field is focused when the finder opens`);
  check(
    (await text(page, '.cook-asof'))[0] === 'As of 18 Nov 2026',
    `${label}: the date used for the ranking is shown`,
  );
  const shown = await onScreen(page);
  check(
    engineRank.candidates.length >= 5 &&
      JSON.stringify(shown) === JSON.stringify(keys(engineRank.candidates)),
    `${label}: the order on screen is the engine's (${shown.length} entries: ${shown.join(', ')})`,
  );
  check(
    new Set(engineRank.candidates.map((c) => c.kind)).size === 3,
    `${label}: components, a dish and a ratio template are all candidates`,
  );
  const reasons = await text(page, '.cook-list .cook-reason');
  check(
    reasons.length === shown.length && reasons.every((r) => r.trim().length > 0),
    `${label}: every entry shows why it is ranked there`,
  );
  const statuses = await text(page, '.cook-list .cook-status');
  check(
    JSON.stringify(statuses) ===
      JSON.stringify(
        engineRank.candidates.map((c) => (c.complete ? 'complete' : `lacks ${c.lacking}`)),
      ),
    `${label}: "complete" or "lacks N" beside each entry, as the engine counts`,
  );
  // The reason names the item that sets the urgency and its days left, from the engine.
  const urgent = engineRank.candidates.filter((c) => c.urgency);
  const reasonOf = (id) => page.locator(`.cook-list li[data-id="${id}"] .cook-reason`).innerText();
  let reasonsOk = urgent.length >= 2;
  for (const c of urgent) {
    const want = `uses the ${itemName(c.urgency.itemId)}`;
    const days = daysPhrase(c.urgency.daysLeft);
    const got = await reasonOf(c.id);
    reasonsOk &&= got.startsWith(want) && (got.includes(days) || c.urgency.daysLeft <= 0);
  }
  check(reasonsOk, `${label}: the reason names the item with the nearest use-by and its days left`);
  const none = engineRank.candidates.find((c) => !c.urgency && c.kind === 'component');
  check(
    (await reasonOf(none.id)).startsWith('nothing it uses has a use-by date'),
    `${label}: an entry with no dated item says so`,
  );
  const li = (id) => page.locator(`.cook-list li[data-id="${id}"]`);
  const soup = ranked(1).candidates.find((c) => c.id === 'cook-potato-leek-soup');
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
  await layout(page, `${label} (list)`);

  // Tapping an entry opens the recipe.
  await li('cook-onion-tart-2').getByRole('link').click();
  await page.getByRole('heading', { level: 1, name: 'Onion tart' }).waitFor();
  check(
    page.url().endsWith('#/components/cook-onion-tart-2'),
    `${label}: an entry opens its recipe`,
  );
  await page.goBack();
  await page.locator('.cook-list').waitFor();
  const dishHref = await li('cook-soup-plate').getByRole('link').getAttribute('href');
  const roux = ranked(1).candidates.find((c) => c.kind === 'template');
  const templateHref = await page
    .locator(`.cook-list li[data-key="${keys([roux])[0]}"] a`)
    .getAttribute('href');
  check(
    dishHref === '#/dishes/cook-soup-plate' && templateHref === `#/ratios/${roux.id}`,
    `${label}: a dish opens the dish, a ratio opens its card`,
  );
  await context.close();
  return problems;
};

const filters = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await reopen(page, origin, 'cook');
  check(
    (await lackingSelect(page).inputValue()) === '1' &&
      (await roleSelect(page).inputValue()) === '',
    `${label}: the filters start at "lacking at most 1" and any role`,
  );
  await lackingSelect(page).selectOption({ label: 'Complete only' });
  const complete = ranked(0).candidates;
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(complete)) &&
      (await text(page, '.cook-status')).every((s) => s === 'complete'),
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
    main.length > 0 &&
      main.length < complete.length &&
      JSON.stringify(await onScreen(page)) === JSON.stringify(keys(main)),
    `${label}: a role keeps only what covers it, order unchanged (${main.length} of ${complete.length})`,
  );
  check(
    (await stored(page)) === JSON.stringify({ role: 'main', lacking: 0 }),
    `${label}: the choice is kept in the preferences`,
  );
  await page.reload();
  await page.locator('.cook-list').waitFor();
  check(
    (await lackingSelect(page).inputValue()) === '0' &&
      (await roleSelect(page).inputValue()) === 'main' &&
      JSON.stringify(await onScreen(page)) === JSON.stringify(keys(main)),
    `${label}: the filters survive a reload`,
  );
  await layout(page, `${label} (filtered)`);
  await lackingSelect(page).selectOption({ label: 'Lacking at most 3' });
  const wide = ranked(3).candidates.filter((c) => c.roles.includes('main'));
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(wide)),
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
    `${label}: the ingredients that are there can be picked (${fromStock.join(', ')})`,
  );
  await layout(page, `${label} (start open)`);
  await page.getByRole('link', { name: 'Leek', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'What uses Leek' }).waitFor();
  check(
    page.url().endsWith('#/cook/cook-leek/with'),
    `${label}: "what uses the leeks" is #/cook/<id>/with`,
  );
  const uses = usesKeys('cook-leek', 1);
  const expected = ranked(1).candidates.filter((c) => uses.has(`${c.kind}:${c.id}`));
  const shown = await onScreen(page);
  check(
    expected.length >= 4 && JSON.stringify(shown) === JSON.stringify(keys(expected)),
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
  await page.locator('.cook-list').waitFor();
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
    (await page.locator('.cook-list').count()) + (await page.locator('.cook-empty').count()) === 1,
    `${label}: an ingredient nothing uses has an empty state, not a broken list`,
  );
  await context.close();
  return problems;
};

const useUp = async (browser, origin) => {
  const { context, page, problems } = await fresh(browser, origin);
  await reopen(page, origin, 'cook/use-up');
  const engineUp = ranked(1).useUpFirst;
  const names = await text(page, '.use-up-item .entry-name');
  check(
    names.length === 3 &&
      JSON.stringify(names) === JSON.stringify(engineUp.map((u) => itemName(u.itemId))),
    `${label}: the use-up list is the engine's, nearest use-by first (${names.join(', ')})`,
  );
  const days = await text(page, '.use-up-item .use-up-days');
  check(
    JSON.stringify(days) === JSON.stringify(engineUp.map((u) => daysPhrase(u.daysLeft))),
    `${label}: the days left are the engine's (${days.join(', ')})`,
  );
  check(
    (await text(page, '.cook-asof'))[0] === 'As of 18 Nov 2026',
    `${label}: the use-up list shows its date`,
  );
  const first = engineUp[0];
  const firstLinks = await page
    .locator(`.use-up-item[data-item-id="${first.itemId}"] .use-up-recipe`)
    .allInnerTexts();
  check(
    first.candidates.length >= 3 && firstLinks.length === first.candidates.length,
    `${label}: each item names the components and dishes that use it (${firstLinks.join(', ')})`,
  );
  check(
    (await page.locator('.use-up-item').last().innerText()).includes(
      'Nothing in your notebook uses it yet.',
    ),
    `${label}: an item nothing uses says so`,
  );
  check(
    (await page.getByRole('link', { name: 'Use up first' }).getAttribute('aria-current')) ===
      'page' && (await page.locator('nav [aria-current="page"]').innerText()).trim() === 'Cook',
    `${label}: Use up first is a view of Cook, marked in the tabs and in the navigation`,
  );
  await layout(page, `${label} (use up first)`);
  await page.locator('.use-up-item').first().getByRole('link').first().click();
  await page.getByRole('heading', { level: 1, name: 'Leek in stock' }).waitFor();
  check(
    page.url().endsWith('#/stock/cook-leek/edit') &&
      (await page.locator('nav [aria-current="page"]').innerText()).trim() === 'Cook',
    `${label}: an item opens in the stock screen, still under Cook`,
  );
  // The three views, by their tabs.
  await reopen(page, origin, 'cook');
  await page.getByRole('link', { name: 'What is there' }).click();
  await page.getByRole('heading', { level: 1, name: 'What is there' }).waitFor();
  check(
    page.url().endsWith('#/stock') &&
      (await page.getByRole('link', { name: 'Tick what is there' }).count()) === 1 &&
      (await page.locator('.cook-tab[aria-current="page"]').innerText()) === 'What is there',
    `${label}: the stock list is the "What is there" view, with its tick action`,
  );
  await page.getByRole('link', { name: 'What can I cook' }).click();
  await page.getByRole('heading', { level: 1, name: 'What can I cook' }).waitFor();
  check(page.url().endsWith('#/cook'), `${label}: the tabs lead back to the finder`);
  await context.close();
  return problems;
};

const empties = async (browser, origin) => {
  // Nothing ticked: the way to tick.
  let { context, page } = await fresh(browser, origin, 360, { stock: [] });
  await reopen(page, origin, 'cook');
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
  await reopen(page, origin, 'cook');
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
  await reopen(page, origin, 'cook');
  await lackingSelect(page).selectOption({ label: 'Complete only' });
  await page.locator('.cook-nearest').waitFor();
  const nearest = await text(page, '.cook-nearest .entry-name');
  const wide = engine.makeable(input(1000, data.today, little));
  const want = wide.candidates
    .filter((c) => c.lacking > 0)
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
  await reopen(page, origin, 'cook', later);
  const engineRank = ranked(1, '2026-11-20');
  check(
    (await text(page, '.cook-asof'))[0] === 'As of 20 Nov 2026' &&
      JSON.stringify(await onScreen(page)) === JSON.stringify(keys(engineRank.candidates)),
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
  for (const hash of ['cook', 'cook/use-up', 'cook/cook-leek/with', 'stock']) {
    await reopen(page, origin, hash);
    const o = await overflow(page);
    await layout(page, `1000px #/${hash}`);
    check(o.scroll <= 0, `1000px #/${hash}: no horizontal scroll`);
  }
  await reopen(page, origin, 'cook');
  check(
    (await page.locator('.cook-list > li').count()) === ranked(1).candidates.length,
    '1000px: the finder lists what the engine ranks',
  );
  await context.close();
  return problems;
};

const offline = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?e2e-store&e2e-now=${NOW}#/cook`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await store(page);
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.cook-list').waitFor();
  check(
    JSON.stringify(await onScreen(page)) === JSON.stringify(keys(ranked(1).candidates)),
    `${label}: offline, the finder shows the same ranking`,
  );
  await page.goto(`${origin}/?e2e-now=${NOW}#/cook/use-up`);
  await page.locator('.use-up-rows').waitFor();
  check(
    (await page.locator('.use-up-item').count()) === 3,
    `${label}: offline, use up first works`,
  );
  await context.close();
  return problems;
};

export const cook = async (browser, server) => {
  const origin = server.origin;
  const problems = [
    ...(await ordering(browser, origin)),
    ...(await filters(browser, origin)),
    ...(await start(browser, origin)),
    ...(await useUp(browser, origin)),
    ...(await clock(browser, origin)),
    ...(await desktop(browser, origin)),
    ...(await offline(browser, origin)),
  ];
  await empties(browser, origin);
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
};
