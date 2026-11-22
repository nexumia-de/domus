// The characters of a dish in a browser, on two dishes built here (patties that are pan-fried
// with a mash, and the mash alone): the chips on the dish, and the character choice of the one
// filter on Cook's list (docs/decisions/cook-screen.md), which offers only the characters a dish
// has and narrows the list. The ingredients here are
// the user's own, without a place in the catalogue, so only a technique gives a character; the
// rules by ingredient are checked without a browser (test/characters.test.ts).
import { addSlot, component } from './dish-swap.mjs';
import { check, watch } from './harness.mjs';
import { formReady, layout, open } from './editor-helpers.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const label = '360px characters';

const dish = async (page, origin, name, fillings) => {
  await open(page, origin, 'dishes/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill(name);
  for (const [i, filling] of fillings.entries()) await addSlot(page, i + 1, filling, '150');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
};

export const dishCharacters = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const { origin } = server;
  await component(page, origin, 'Fried patties', 'main', 'Beef', '500', 't:pan-fry');
  await component(page, origin, 'Plain mash', 'starch', 'Potato', '800', 'a:mash');
  // Mashing names no heat, so a dish of the mash alone is Uncooked and not Fried.
  await dish(page, origin, 'Mash plate', ['Plain mash']);
  await dish(page, origin, 'Patty plate', ['Fried patties', 'Plain mash']);

  const chips = page.locator('.character-chip');
  await chips.first().waitFor();
  check(
    same(await chips.allInnerTexts(), ['Fried']),
    `${label}: a dish whose patties are pan-fried is Fried (${(await chips.allInnerTexts()).join(', ')})`,
  );
  check(
    ((await chips.first().getAttribute('title')) ?? '').startsWith('Judgement'),
    `${label}: the chip says what its rule rests on`,
  );
  await layout(page, `${label}, dish`);

  await open(page, origin, 'cook');
  // The list holds the shipped dishes too; their characters come from the catalogue, which loads
  // after the first draw. Only the dishes of the notebook are looked at here.
  // The filter is folded behind its summary line; open it.
  await page.locator('.dish-filter-summary').click();
  await page.getByLabel('From', { exact: true }).selectOption({ label: 'Mine' });
  const filter = page.getByLabel('What it is like');
  await page.waitForFunction(
    () => document.querySelectorAll('.dish-filter-character option').length > 3,
  );
  const options = await filter.locator('option').allInnerTexts();
  check(
    options[0] === 'Anything' &&
      options.indexOf('Fried') > 0 &&
      options.indexOf('Uncooked') > options.indexOf('Fried'),
    `${label}: the filter offers the characters the dishes have, in the table's order (${options.join(', ')})`,
  );
  const names = () => page.locator('.dish-rows .entry-name').allInnerTexts();
  await filter.selectOption({ label: 'Fried' });
  check(
    same(await names(), ['Patty plate']),
    `${label}: Fried narrows the list to the fried dish (${(await names()).join(', ')})`,
  );
  await page.getByLabel('Search by name').fill('zzz');
  check(
    (await page.locator('.dish-rows .empty').innerText()) === 'No dish fits these choices.',
    `${label}: nothing found under a character says so`,
  );
  await page.getByLabel('Search by name').fill('');
  await layout(page, `${label}, list`);
  await filter.selectOption({ label: 'Anything' });
  check(
    same(await names(), ['Mash plate', 'Patty plate']),
    `${label}: Anything shows every dish of mine again (${(await names()).join(', ')})`,
  );
  check(
    problems.length === 0,
    `${label}: no console error, no foreign request ${problems.join('; ')}`,
  );
  await context.close();
};
