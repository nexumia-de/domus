// Alternatives per slot and the random pick in a browser: three components with a role, one of
// them in stock, and a dish of two slots. The slot with another component of its role is swapped:
// shown and cooked with the other filling while nothing is stored, then kept as a new version.
// The random pick rolls one component per role, rolls a role again, picks only from stock, and
// hands the picks to the dish editor. The pick itself is by `Math.random` here: the checks only
// rely on what holds for every number (the pure pick is in test/dish-swap-pick.test.ts and
// test/dish-pick-filter.test.ts). Then "Surprise me with a dish" under the one stored filter, and
// the roll per role with a character chosen: the components here are made of ingredients the user
// typed, which have no character, so the browser sees only the honest "none" of that roll; the
// narrowing itself is proved with catalogue ingredients in the unit test.
import { check, watch } from './harness.mjs';
import { addNewIngredient, formReady, layout, listStore, open } from './editor-helpers.mjs';
import { wrappedTexts } from './measure.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const card = (page, n) => page.locator('.step-card').nth(n - 1);
const slot = (page, n) => page.locator('.slot-edit').nth(n - 1);
const fillings = (page) => page.locator('.slots-table .line-link').allInnerTexts();
const totals = (page) => page.locator('.slots-table td.num:last-child').allInnerTexts();
const pickRows = (page) => page.locator('.pick-row .pick-text').allInnerTexts();

export const component = async (page, origin, name, role, ingredient, grams, word) => {
  await open(page, origin, 'components/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Usual role in a dish').selectOption(role);
  await addNewIngredient(page, ingredient, '', grams, 0);
  await page.getByRole('button', { name: 'Add a step' }).click();
  await card(page, 1).getByLabel('What is done').selectOption(word);
  await card(page, 1).getByLabel(ingredient).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
};

export const addSlot = async (page, n, name, grams) => {
  await page.getByRole('button', { name: 'Add a slot' }).click();
  await page.getByLabel('Search your notebook').fill(name);
  await page.getByRole('button', { name: `${name} component`, exact: true }).click();
  await slot(page, n)
    .getByLabel(/^Amount per portion/)
    .fill(grams);
};

const build = async (page, origin) => {
  await component(page, origin, 'Swap patties', 'main', 'Beef', '500', 't:pan-fry');
  await component(page, origin, 'Swap mash', 'starch', 'Potato', '800', 'a:mash');
  await component(page, origin, 'Swap rice', 'starch', 'Rice', '400', 'a:drain');
  // The rice is made ahead: a batch in stock.
  await page.getByRole('button', { name: 'Made it: put it in stock' }).click();
  await page.waitForURL(/#\/stock\/[^/]+\/edit$/);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.stock-rows').waitFor();

  await open(page, origin, 'dishes/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill('Swap plate');
  await page.getByLabel('Portions', { exact: true }).fill('2');
  await addSlot(page, 1, 'Swap patties', '150');
  await addSlot(page, 2, 'Swap mash', '200');
  const roles = await page
    .locator('.slot-edit')
    .evaluateAll((rows) => rows.map((row) => row.querySelector('select').value));
  check(
    same(roles, ['main', 'starch']),
    `360px swap: a new slot takes the usual role of the component picked for it (${roles.join(', ')})`,
  );
  await page.getByRole('button', { name: 'Add a step' }).click();
  await card(page, 1).getByLabel('What is done').selectOption('a:serve');
  await card(page, 1).getByLabel('Swap patties').check();
  await card(page, 1).getByLabel('Swap mash').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Swap plate' }).waitFor();
};

const swap = async (page) => {
  const label = '360px swap';
  const swaps = page.locator('.slot-swap');
  check(
    (await swaps.count()) === 1 &&
      (await swaps.first().getAttribute('aria-label')) === 'Swap: Swap mash',
    `${label}: only the slot with another component of its role offers Swap`,
  );
  check(
    (await page.locator('.swap-notice').count()) === 0,
    `${label}: nothing says "swapped" before a swap`,
  );
  await page.getByRole('button', { name: 'Swap: Swap mash' }).click();
  const offered = await page.locator('.slot-choice').allInnerTexts();
  check(
    same(offered, ['Swap rice']) &&
      (await page.locator('.slot-choices-label').innerText()) === 'In place of Swap mash:',
    `${label}: Swap lists the other components of the role (${offered.join(', ')})`,
  );
  await layout(page, `${label} (alternatives open)`);
  {
    const wrapped = await wrappedTexts(page, '.slots-table td.num');
    check(
      wrapped.length === 0,
      `${label} (alternatives open): every amount of a slot stays on one line ${wrapped.join(' | ')}`,
    );
  }
  await page.getByRole('button', { name: 'Swap rice', exact: true }).click();
  check(
    same(await fillings(page), ['Swap patties', 'Swap rice']) &&
      same(await totals(page), ['300 g', '400 g']),
    `${label}: the slot shows the other filling with the slot's amount (${(await fillings(page)).join(', ')})`,
  );
  check(
    (await page.locator('.slots-table').getByText('swapped for now').count()) === 1 &&
      (await page.locator('.swap-notice .note-quiet').innerText()) ===
        'Swapped for now. Nothing is stored.',
    `${label}: the slot and a quiet line say that it is swapped for now`,
  );
  const raw = await page.locator('.raw-section').innerText();
  // The components here have no weighed output, so the list names the fillings it cannot add up;
  // the sum of the raw ingredients after a swap is in test/dish-swap-pick.test.ts.
  check(
    raw.includes('Swap rice') && !raw.includes('Swap mash'),
    `${label}: the list of what goes in follows the swap`,
  );
  check(
    same(
      await page
        .locator('.dish-card .method-block .recipe-steps')
        .last()
        .locator('li')
        .allInnerTexts(),
      ['Serve: Swap patties, Swap rice'],
    ),
    `${label}: the assembly names the other filling`,
  );
  check(
    await page.evaluate(() => document.activeElement?.getAttribute('data-swap') === '1'),
    `${label}: the focus is back on the slot's Swap`,
  );
  const dishes = await listStore(page, 'dishes');
  const nameOf = new Map((await listStore(page, 'components')).map((c) => [c.id, c.name]));
  check(
    dishes.length === 1 &&
      same(
        dishes[0].slots.map((s) => nameOf.get(s.ref.id)),
        ['Swap patties', 'Swap mash'],
      ),
    `${label}: nothing is stored by the swap`,
  );
  await layout(page, `${label} (swapped)`);
  {
    const wrapped = await wrappedTexts(page, '.slots-table td.num');
    check(
      wrapped.length === 0,
      `${label} (swapped): every amount of a slot stays on one line ${wrapped.join(' | ')}`,
    );
  }

  // The cook screen cooks what was swapped; the rice is in stock, so it is one step.
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 1 of 3' }).waitFor();
  check(
    (await page.getByText('From: Swap patties').count()) === 1,
    `${label}: cooking starts with the component that stayed`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 2 of 3' }).waitFor();
  check(
    (await page.locator('.cook-step-text').innerText()) === 'From stock: Swap rice',
    `${label}: the swapped filling is the one that is cooked (here: taken from stock)`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 3 of 3' }).waitFor();
  check(
    same(await page.locator('.cook-step .recipe-name').allInnerTexts(), [
      'Swap patties',
      'Swap rice',
    ]) && same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), ['300 g', '400 g']),
    `${label}: the assembly step uses the swapped filling with its amount`,
  );
  await page.getByRole('link', { name: 'Back to the dish' }).first().click();
  // The cook screen has the dish's name as its heading too: wait for the dish's own table.
  await page.locator('.slots-table').waitFor();
  check(
    same(await fillings(page), ['Swap patties', 'Swap rice']),
    `${label}: back on the dish the swap is still there`,
  );

  await page.getByRole('button', { name: 'Back to the stored fillings' }).click();
  check(
    same(await fillings(page), ['Swap patties', 'Swap mash']) &&
      (await page.locator('.swap-notice').count()) === 0,
    `${label}: "Back to the stored fillings" shows the dish as stored`,
  );
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 1 of 3' }).waitFor();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 2 of 3' }).waitFor();
  check(
    (await page.getByText('From: Swap mash').count()) === 1 &&
      (await page.locator('.cook-step-text').innerText()) === 'Mash',
    `${label}: and the stored dish is cooked again (the mash is made)`,
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: 'Swap plate' }).waitFor();

  await page.getByRole('button', { name: 'Swap: Swap mash' }).click();
  await page.getByRole('button', { name: 'Swap rice', exact: true }).click();
  const before = page.url();
  await page.getByRole('button', { name: 'Keep as my version' }).click();
  await page.waitForURL((url) => url.href !== before);
  await page.getByRole('heading', { level: 1, name: 'Swap plate' }).waitFor();
  const kept = await listStore(page, 'dishes');
  const first = kept.find((d) => d.version.parent === undefined);
  const next = kept.find((d) => d.version.parent !== undefined);
  const rice = (await listStore(page, 'components')).find((c) => c.name === 'Swap rice');
  check(
    kept.length === 2 &&
      next?.version.parent === first?.id &&
      next?.version.family === first?.version.family &&
      next?.version.change === 'Swap rice in place of Swap mash' &&
      next?.slots[1].ref.id === rice?.version.family &&
      same(next?.slots[1].amount, { value: 200, unit: 'g' }) &&
      same(next?.steps, first?.steps),
    `${label}: "Keep as my version" stores a new version with the change named (${JSON.stringify(next?.version)})`,
  );
  check(
    page.url().endsWith(`#/dishes/${next?.id}`) &&
      same(await fillings(page), ['Swap patties', 'Swap rice']) &&
      (await page.locator('.swap-notice').count()) === 0 &&
      same(await page.locator('.slot-swap').evaluateAll((n) => n.map((b) => b.ariaLabel)), [
        'Swap: Swap rice',
      ]),
    `${label}: the new version is shown, with nothing swapped and the mash as its alternative`,
  );
  await layout(page, `${label} (kept version)`);
};

const random = async (page, origin) => {
  const label = '360px random pick';
  await open(page, origin, 'dishes');
  await page.getByRole('link', { name: 'Put a dish together at random' }).click();
  await page.getByRole('heading', { level: 1, name: 'Random pick' }).waitFor();
  check(page.url().endsWith('#/dishes/random'), `${label}: the screen has its own route`);
  const ticked = await page
    .locator('.pick-roles .choice')
    .evaluateAll((labels) =>
      labels.filter((l) => l.querySelector('input').checked).map((l) => l.textContent),
    );
  check(
    same(ticked, ['Main element', 'Sauce', 'Starch']) &&
      !(await page.getByLabel('Only what is ready in stock').isChecked()),
    `${label}: main, sauce and starch are ticked, "only from stock" is not (${ticked.join(', ')})`,
  );
  check(
    (await page
      .getByText('The pick is random within each role. It does not know what goes together.')
      .count()) === 1,
    `${label}: a quiet line says what the pick does not know`,
  );
  check((await page.locator('.pick-row').count()) === 0, `${label}: nothing is picked before Roll`);
  await layout(page, `${label} (before the roll)`);

  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  let rows = await pickRows(page);
  const starch = (text) => text.split('\n')[1];
  check(
    rows.length === 3 &&
      rows[0] === 'Main element\nSwap patties\nThe only one for this role.' &&
      rows[1] === 'Sauce\nNo component of yours has this role yet.' &&
      ['Swap mash', 'Swap rice'].includes(starch(rows[2])),
    `${label}: one component per role, a role without one says so (${rows.join(' | ')})`,
  );
  check(
    same(await page.locator('.pick-again').evaluateAll((n) => n.map((b) => b.ariaLabel)), [
      'Roll again: Starch',
    ]),
    `${label}: only a role with more than one candidate can be rolled again`,
  );
  await layout(page, `${label} (rolled)`);
  const firstStarch = starch(rows[2]);
  await page.getByRole('button', { name: 'Roll again: Starch' }).click();
  rows = await pickRows(page);
  check(
    starch(rows[2]) !== firstStarch &&
      ['Swap mash', 'Swap rice'].includes(starch(rows[2])) &&
      rows[0].startsWith('Main element\nSwap patties'),
    `${label}: rolling one role again gives the other component and leaves the rest (${rows[2]})`,
  );

  await page.getByLabel('Only what is ready in stock').check();
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  rows = await pickRows(page);
  check(
    same(rows, [
      'Main element\nNothing with this role is in stock.',
      'Sauce\nNothing with this role is in stock.',
      'Starch\nSwap rice\nin stock\nThe only one for this role.',
    ]),
    `${label}: only from stock picks what has a stock item (${rows.join(' | ')})`,
  );
  await layout(page, `${label} (only from stock)`);

  await page.getByLabel('Only what is ready in stock').uncheck();
  await page.getByLabel('Sauce', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  rows = await pickRows(page);
  const picked = starch(rows[1]);
  check(rows.length === 2, `${label}: a role that is not ticked is not rolled`);
  const stored = (await listStore(page, 'dishes')).length;
  await page.getByRole('button', { name: 'Make it a dish' }).click();
  await formReady(page);
  check(
    page.url().endsWith('#/dishes/new') &&
      same(await page.locator('.slot-edit .pick-name').allInnerTexts(), ['Swap patties', picked]) &&
      same(
        await page
          .locator('.slot-edit')
          .evaluateAll((rows) => rows.map((row) => row.querySelector('select').value)),
        ['main', 'starch'],
      ) &&
      (await page.getByLabel('Name', { exact: true }).inputValue()) === '',
    `${label}: "Make it a dish" opens the dish editor with the picks as slots`,
  );
  check(
    (await listStore(page, 'dishes')).length === stored,
    `${label}: nothing is stored until the dish is saved`,
  );
  await layout(page, `${label} (editor from the pick)`);
  await page.getByLabel('Name', { exact: true }).fill('Thrown together');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Thrown together' }).waitFor();
  const made = (await listStore(page, 'dishes')).find((d) => d.name === 'Thrown together');
  check(
    same(
      made?.slots.map((s) => [s.role, s.ref.kind, s.amount]),
      [
        ['main', 'component', undefined],
        ['starch', 'component', undefined],
      ],
    ) && same(await fillings(page), ['Swap patties', picked]),
    `${label}: saved, the dish has one slot per picked role (${JSON.stringify(made?.slots)})`,
  );
};

const dishLink = (page) => page.locator('.pick-dish-link');

const surprise = async (page, origin) => {
  const label = '360px surprise me';
  await open(page, origin, 'dishes/random');
  check(
    (await page.locator('.pick-filter .dish-filter').count()) === 1 &&
      (await page.getByRole('heading', { level: 2, name: 'Surprise me with a dish' }).count()) ===
        1 &&
      (await dishLink(page).count()) === 0,
    `${label}: the screen shows the shared filter and nothing rolled yet`,
  );
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  const first = await dishLink(page).getAttribute('href');
  const among = await page.locator('.pick-dish-among').innerText();
  const n = Number(/(\d+)/.exec(among)?.[1] ?? 0);
  check(
    /^#\/(dishes|classic)\//.test(first ?? '') && n > 2,
    `${label}: one dish of all, own or shipped, links to its screen (${first}; ${among})`,
  );
  await layout(page, `${label} (rolled)`);
  await page.getByRole('button', { name: 'Roll again: another dish' }).click();
  const second = await dishLink(page).getAttribute('href');
  check(
    second !== first && /^#\/(dishes|classic)\//.test(second ?? ''),
    `${label}: "Roll again" gives another dish (${first} then ${second})`,
  );

  await page.getByLabel('From', { exact: true }).selectOption('own');
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  const own = await dishLink(page).getAttribute('href');
  check(
    own?.startsWith('#/dishes/') &&
      (await page.locator('.pick-dish-among').innerText()) === 'By chance among 2 dishes.' &&
      (await page.locator('.pick-dish-meta').innerText()).startsWith('My dishes'),
    `${label}: "My dishes" rolls among the two dishes of the notebook (${own})`,
  );
  // The choice is the one stored filter: it is there after a reload, as for the list.
  await open(page, origin, 'dishes/random');
  check(
    (await page.getByLabel('From', { exact: true }).inputValue()) === 'own' &&
      (await page.evaluate(() => localStorage.getItem('culina.dishes'))) === '{"origin":"own"}',
    `${label}: the choice is kept in the shared filter`,
  );

  await page.getByLabel('Cuisine', { exact: true }).selectOption('it');
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  check(
    (await dishLink(page).count()) === 0 &&
      (await page.locator('.pick-dish-none').innerText()) === 'No dish fits these choices.',
    `${label}: nothing fits: the quiet sentence`,
  );
  await layout(page, `${label} (nothing fits)`);
  await page.getByRole('button', { name: 'Show all', exact: true }).click();
  check(
    (await page.getByLabel('From', { exact: true }).inputValue()) === '' &&
      (await page.getByLabel('Cuisine', { exact: true }).inputValue()) === '' &&
      (await dishLink(page).count()) === 1,
    `${label}: "Show all" drops the choices and rolls among every dish`,
  );

  // Only the rice is in stock: the stock allows no dish now.
  await page.getByLabel('Only what the stock allows now').check();
  await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
  check(
    (await dishLink(page).count()) === 0 &&
      (await page.locator('.pick-dish-none').innerText()) ===
        'The stock allows none of these dishes now.',
    `${label}: "only what the stock allows" with nothing allowed says so`,
  );
  await page.getByLabel('Only what the stock allows now').uncheck();

  // The roll per role with a character: the typed ingredients have none.
  const fitsLine = 'Rolled among the combinations that are like your choice above.';
  check(
    !(await page.getByText(fitsLine).isVisible()),
    `${label}: without a character the roll per role says nothing about fitting`,
  );
  await page.getByLabel('What it is like', { exact: true }).selectOption('tomatoey');
  check(
    await page.getByText(fitsLine).isVisible(),
    `${label}: with a character the roll per role says it rolls among what fits`,
  );
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  check(
    (await page.locator('.pick-row').count()) === 0 &&
      (await page.locator('.pick-no-fit').innerText()) ===
        'No combination of your components is like that.',
    `${label}: no combination with the character: the honest sentence, no pick`,
  );
  await layout(page, `${label} (no combination fits)`);
  await page.getByLabel('What it is like', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  check(
    (await page.locator('.pick-row').count()) > 0 &&
      (await page.locator('.pick-no-fit').count()) === 0,
    `${label}: control: without the character the same roll picks`,
  );

  // The stock tick changes what a role may hold: the picks rolled under the other choice go.
  await page.getByLabel('Only what is ready in stock').check();
  check(
    (await page.locator('.pick-row').count()) === 0,
    `${label}: ticking "only what is ready in stock" drops the picks rolled without it`,
  );
  await page.getByLabel('Only what is ready in stock').uncheck();

  // A change of the filter keeps the keyboard where it was (review of 3b9d11e).
  const cuisine = page.getByLabel('Cuisine', { exact: true });
  await cuisine.focus();
  await page.keyboard.press('ArrowDown');
  check(
    (await cuisine.inputValue()) !== '' &&
      (await page.evaluate(() =>
        document.activeElement?.classList.contains('dish-filter-cuisine'),
      )),
    `${label}: after a change by keyboard the cuisine select still has the focus`,
  );
  const meatFree = page.getByLabel('Without meat and fish', { exact: true });
  await meatFree.focus();
  await page.keyboard.press('Space');
  check(
    (await meatFree.isChecked()) &&
      (await page.evaluate(
        () =>
          document.activeElement
            ?.closest('.choice')
            ?.classList.contains('dish-filter-meat-free') === true,
      )),
    `${label}: after a tick by keyboard its box still has the focus`,
  );
  await meatFree.uncheck();
  await cuisine.selectOption('');

  // The list writes the same filter: what was found under another choice is dropped on return.
  await page.getByLabel('What it is like', { exact: true }).selectOption('tomatoey');
  await page.getByRole('button', { name: 'Roll', exact: true }).click();
  await page.locator('.pick-no-fit').waitFor();
  // In-app navigation, not a reload: the picks live in memory while the app is open.
  const toList = async () => {
    await page.getByRole('link', { name: 'All dishes' }).click();
    await page.getByRole('link', { name: 'Put a dish together at random' }).waitFor();
  };
  const toPick = async () => {
    await page.getByRole('link', { name: 'Put a dish together at random' }).click();
    await page.getByRole('heading', { level: 1, name: 'Random pick' }).waitFor();
  };
  await toList();
  await toPick();
  check(
    (await page.locator('.pick-no-fit').count()) === 1,
    `${label}: control: back on the screen with the same filter, "none found" is still there`,
  );
  await toList();
  // The list folds its filter behind a summary line; open it when it is closed.
  const fold = page.locator('details.dish-filter-fold');
  if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click();
  await page.getByLabel('What it is like', { exact: true }).selectOption('');
  await toPick();
  check(
    (await page.locator('.pick-no-fit').count()) === 0 &&
      (await page.locator('.pick-row').count()) === 0,
    `${label}: a character dropped on the list drops the "none found" judged under it`,
  );
};

export const dishSwap = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await build(page, server.origin);
  await swap(page);
  await random(page, server.origin);
  await surprise(page, server.origin);
  check(
    problems.length === 0,
    `360px swap and random pick: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};
