// A whole dish in a browser: two components with steps, one of them made and put into stock, a
// dish that puts them in slots and has an assembly step, and the dish cooked step by step: the
// component that has to be made with its amounts for the portions, the one in stock as one step,
// then the assembly with the fillings.
import { check, watch } from './harness.mjs';
import { addNewIngredient, formReady, layout, listStore, open } from './editor-helpers.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const card = (page, n) => page.locator('.step-card').nth(n - 1);
const slot = (page, n) => page.locator('.slot-edit').nth(n - 1);

const component = async (page, origin, name, ingredient, grams, word) => {
  await open(page, origin, 'components/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill(name);
  await addNewIngredient(page, ingredient, '', grams, 0);
  await page.getByRole('button', { name: 'Add a step' }).click();
  await card(page, 1).getByLabel('What is done').selectOption(word);
  await card(page, 1).getByLabel(ingredient).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
};

const build = async (page, origin) => {
  const label = '360px dish';
  await component(page, origin, 'Kit patties', 'Beef', '500', 't:pan-fry');
  await component(page, origin, 'Kit mash', 'Potato', '800', 'a:mash');
  // The mash is made ahead: a batch in stock.
  await page.getByRole('button', { name: 'Made it: put it in stock' }).click();
  await page.waitForURL(/#\/stock\/[^/]+\/edit$/);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.stock-rows').waitFor();

  await open(page, origin, 'dishes/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill('Kit plate');
  await page.getByLabel('Portions', { exact: true }).fill('2');
  check(
    (await page.getByRole('heading', { level: 2, name: 'Assembly' }).count()) === 1,
    `${label}: the dish editor has an Assembly section`,
  );
  await page.getByRole('button', { name: 'Add a step' }).click();
  check(
    (await card(page, 1).locator('.step-uses').innerText()).includes('Add slots above first.'),
    `${label}: without slots a step says to add them first`,
  );
  await page.getByRole('button', { name: 'Add a slot' }).click();
  await page.getByLabel('Search your notebook').fill('Kit patties');
  await page.getByRole('button', { name: 'Kit patties component', exact: true }).click();
  await slot(page, 1)
    .getByLabel(/^Amount per portion/)
    .fill('150');
  await page.getByRole('button', { name: 'Add a slot' }).click();
  await page.getByLabel('Search your notebook').fill('Kit mash');
  await page.getByRole('button', { name: 'Kit mash component', exact: true }).click();
  await slot(page, 2)
    .getByLabel(/^Amount per portion/)
    .fill('200');
  check(
    same(await card(page, 1).locator('.step-uses .choice').allInnerTexts(), [
      'Kit patties',
      'Kit mash',
    ]) && (await card(page, 1).locator('.step-uses legend').innerText()) === 'Which fillings',
    `${label}: an assembly step offers the fillings of the slots to tick`,
  );
  await card(page, 1).getByLabel('What is done').selectOption('a:serve');
  await card(page, 1).getByLabel('Kit patties').check();
  await card(page, 1).getByLabel('Kit mash').check();
  await layout(page, `${label} (editor with assembly)`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Kit plate' }).waitFor();

  const assembly = await page
    .locator('.dish-card .method-block .recipe-steps')
    .last()
    .locator('li')
    .allInnerTexts();
  check(
    same(assembly, ['Serve: Kit patties, Kit mash']),
    `${label}: the dish shows its assembly (${assembly.join(' | ')})`,
  );
  const stored = (await listStore(page, 'dishes')).find((d) => d.name === 'Kit plate');
  check(
    same(stored?.steps, [{ action: 'serve', uses: ['s1', 's2'] }]) &&
      same(
        stored?.slots.map((s) => s.key),
        ['s1', 's2'],
      ),
    `${label}: the assembly is stored by word and slot key (${JSON.stringify(stored?.steps)})`,
  );
  await layout(page, `${label} (dish with assembly)`);
};

const cook = async (page) => {
  const label = '360px dish cooking';
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 1 of 3' }).waitFor();
  check(/#\/dishes\/[^/]+\/cook$/.test(page.url()), `${label}: the route ends in /cook`);
  check(
    (await page.getByText('From: Kit patties').count()) === 1 &&
      (await page.locator('.cook-step-text').innerText()) === 'Pan-frying',
    `${label}: the first step is the component that has to be made`,
  );
  // 150 g per portion, 2 portions: 300 g of a run of 500 g.
  check(
    same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), ['300 g']),
    `${label}: with its amount for the portions of the dish`,
  );
  check(
    await page.getByRole('heading', { name: 'Technique: Pan-frying' }).isVisible(),
    `${label}: and the note of its skill`,
  );
  await layout(page, `${label} (step 1)`);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 2 of 3' }).waitFor();
  check(
    (await page.locator('.cook-step-text').innerText()) === 'From stock: Kit mash' &&
      (await page.locator('.cook-step .recipe-line').count()) === 0,
    `${label}: the component that is in stock is one step`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 3 of 3' }).waitFor();
  check(
    (await page.locator('.cook-step-text').innerText()) === 'Serve' &&
      same(await page.locator('.cook-step .recipe-name').allInnerTexts(), [
        'Kit patties',
        'Kit mash',
      ]) &&
      same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), ['300 g', '400 g']),
    `${label}: the assembly step shows the fillings with their amounts`,
  );
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('heading', { level: 2, name: 'That was the last step.' }).waitFor();
  await page.locator('.cook-body').getByRole('link', { name: 'Back to the dish' }).click();
  await page.getByRole('heading', { level: 1, name: 'Kit plate' }).waitFor();
  check(true, `${label}: the end leads back to the dish`);
};

// The dish screen is the one of a shipped dish: the quiet line, the ingredient lines per component,
// the nutrition behind a tap; and the portions chosen there are the ones cooked.
const sameScreen = async (page) => {
  const label = '360px dish screen of an own dish';
  await page.getByRole('heading', { level: 1, name: 'Kit plate' }).waitFor();
  check(
    (await page.locator('.dish-quiet').innerText()).includes('In my notebook'),
    `${label}: the quiet line names the origin (${await page.locator('.dish-quiet').innerText()})`,
  );
  const groups = await page.locator('.recipe-block').first().locator('h3').allInnerTexts();
  check(
    same(groups, ['Kit patties', 'Kit mash', 'For the dish']),
    `${label}: the ingredient lines per component and for the dish (${groups.join(', ')})`,
  );
  check(
    (await page.locator('.nutrition-block summary').first().innerText()) ===
      'Nutrition per portion',
    `${label}: nutrition per portion behind a tap`,
  );
  await page.getByRole('button', { name: 'More portions' }).click();
  await layout(page, `${label} (3 portions)`);
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 1 of 3' }).waitFor();
  // 150 g per portion, now 3 portions: 450 g of a run of 500 g.
  check(
    same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), ['450 g']),
    `${label}: the portions chosen on the dish reach the cook screen`,
  );
};

export const dishCook = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await build(page, server.origin);
  await cook(page);
  await sameScreen(page);
  check(
    problems.length === 0,
    `360px dish: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};
