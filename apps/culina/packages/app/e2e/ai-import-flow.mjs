// The AI import in a browser (issue 40): paste a broken answer and see one sentence per error and
// nothing stored; paste a two-recipe answer in a Markdown fence, with a guessed amount and an
// alternative; confirm the names; save both recipes at once; Undo takes all of it back. The
// answers are written by hand: what a real model writes for the prompt is not checked here.
import { check } from './harness.mjs';
import { layout } from './editor-helpers.mjs';
import { same } from './exchange-fixture.mjs';

const label = '360px AI import';

export const ANSWER = {
  format: 'culina-recipes',
  formatVersion: 1,
  recipes: [
    {
      title: 'Pancakes with apple sauce',
      persons: 4,
      source: { title: 'Family card', where: 'back side' },
      components: [
        {
          name: 'Pancake batter',
          lines: [
            { ingredient: 'flour', amount: '250 g', role: 'flour' },
            { ingredient: 'oat milk', amount: '500 ml', role: 'liquid' },
            { ingredient: 'butter', amount: '2 EL', guessed: true, note: 'for the pan' },
          ],
          steps: ['Whisk flour and milk.', 'Bake thin pancakes in the butter.'],
        },
        { name: 'Apple sauce', lines: [{ ingredient: 'cooking apples', amount: '4' }] },
        { name: 'Cinnamon sugar', lines: [{ ingredient: 'ground cinnamon', amount: '1 TL' }] },
      ],
      slots: [
        { role: 'main', component: 'Pancake batter' },
        { role: 'sauce', component: 'Apple sauce', alternatives: ['Cinnamon sugar'] },
      ],
      steps: ['Serve with the sauce.'],
    },
    {
      title: 'Brown butter sauce',
      yield: '200 g',
      components: [
        {
          name: 'Brown butter sauce',
          role: 'sauce',
          lines: [
            { ingredient: 'butter', amount: '250 g' },
            { ingredient: 'flaky salt', amount: '1 Prise' },
          ],
        },
      ],
    },
  ],
};

const BROKEN = {
  format: 'culina-recipes',
  formatVersion: 1,
  recipes: [
    {
      title: 'Pancakes',
      persons: 0,
      components: [{ name: 'Batter', lines: [{ amount: '250 g' }] }],
    },
  ],
};

const names = ['Pancakes with apple sauce', 'Brown butter sauce'];
// The names no ingredient of the fixture notebook has: the step creates them.
const NEW_NAMES = ['oat milk', 'cooking apples', 'ground cinnamon', 'flaky salt'];
const ours = async (listAll, page) => {
  const all = await listAll(page);
  return {
    dishes: all.dishes.filter((d) => names.includes(d.name)),
    components: all.components.filter((c) =>
      ['Pancake batter', 'Apple sauce', 'Cinnamon sugar', 'Brown butter sauce'].includes(c.name),
    ),
    ingredients: all.ingredients.filter((i) => NEW_NAMES.includes(i.name)),
  };
};

/** Pastes an answer and reads it. */
export const paste = async (page, text) => {
  await page.getByLabel('Answer of the AI').fill(text);
  await page.getByRole('button', { name: 'Read the answer' }).click();
};

export const aiImport = async (page, origin, { openAt, listAll, nowQuery }) => {
  await openAt(page, origin, 'settings/import', nowQuery);
  const before = await ours(listAll, page);

  // ---- a broken answer: one sentence per error, nothing stored
  await paste(page, JSON.stringify(BROKEN, null, 2));
  await page.locator('.ai-errors').waitFor();
  check(
    same(await page.locator('.ai-errors li').allTextContents(), [
      'Recipe 1 (Pancakes): "persons" must be a whole number from 1 to 100.',
      'Recipe 1 (Pancakes), component 1 (Batter), line 1: "ingredient" is needed.',
    ]),
    `${label}: a broken answer shows one sentence per error (${(
      await page.locator('.ai-errors li').allTextContents()
    ).join(' | ')})`,
  );
  check(
    (await page.locator('.import > p[role=status]').innerText()) === 'Nothing was changed.' &&
      same(await ours(listAll, page), before),
    `${label}: a broken answer changes nothing`,
  );

  // ---- two recipes in a Markdown fence, as models often answer
  await paste(page, '```json\n' + JSON.stringify(ANSWER, null, 2) + '\n```');
  await page.getByText('Recipes in the answer').waitFor();
  check(
    (await page.locator('.cook-head .note').first().innerText()) ===
      '2 recipes with 7 ingredient lines read. Nothing is saved until you save.',
    `${label}: what was read is reported`,
  );
  check(
    (await page.locator('.ai-guessed-count').innerText()).startsWith(
      'The AI marked 1 amount as guessed.',
    ) &&
      (await page
        .locator('.cook-line', { hasText: 'butter: 2 EL' })
        .locator('.guessed')
        .count()) === 1,
    `${label}: the guessed amount is shown as guessed`,
  );
  check(
    (await page.getByLabel('Ingredient for butter').count()) === 1 &&
      (await page.getByLabel('Ingredient for butter').inputValue()) === 'ingredient:butter',
    `${label}: a name in two recipes is asked once, an exact match preselected`,
  );
  check(
    (await page.getByText('Becomes a dish with 3 components.').count()) === 1 &&
      (await page.getByText('Becomes a component.').count()) === 1 &&
      (await page
        .getByText('Alternative for Apple sauce: not in the dish; Swap offers it.')
        .count()) === 1,
    `${label}: each recipe says what it becomes, the alternative says so`,
  );
  const amountOptions = await page
    .locator('.cook-line', { hasText: 'butter: 2 EL' })
    .getByLabel('Amount of butter')
    .locator('option')
    .allTextContents();
  check(
    same(amountOptions, ['I weighed it', 'Leave open, keep as text']) &&
      (await page
        .locator('.cook-line', { hasText: 'butter: 2 EL' })
        .getByLabel('Amount of butter')
        .inputValue()) === 'open',
    `${label}: a spoon word without a readable size is left open or weighed (${amountOptions.join(' | ')})`,
  );
  check(
    await page.getByRole('button', { name: 'Save all recipes' }).isDisabled(),
    `${label}: nothing can be saved while names are open`,
  );
  await page
    .getByRole('button', { name: 'Create a new ingredient for every name left open' })
    .click();
  check(
    await page.getByRole('button', { name: 'Save all recipes' }).isEnabled(),
    `${label}: every name decided, Save is possible`,
  );
  await layout(page, `${label} (AI import step)`);
  check(same(await ours(listAll, page), before), `${label}: nothing is stored before Save`);

  await page.getByRole('button', { name: 'Save all recipes' }).click();
  await page.locator('.cook-result').waitFor();
  const saved = await ours(listAll, page);
  const dish = saved.dishes[0];
  const batter = saved.components.find((c) => c.name === 'Pancake batter');
  const sugar = saved.components.find((c) => c.name === 'Cinnamon sugar');
  const brown = saved.components.find((c) => c.name === 'Brown butter sauce');
  check(
    saved.dishes.length === 1 &&
      saved.components.length === 4 &&
      saved.ingredients.length === 4 &&
      dish.portions === 4 &&
      same(
        dish.slots.map((s) => s.role),
        ['main', 'sauce'],
      ) &&
      sugar.role === 'sauce' &&
      dish.version.change === 'Imported from an AI answer; source: Family card, back side',
    `${label}: both recipes are saved: a dish with an alternative, a component`,
  );
  check(
    batter.lines[2].note === 'for the pan, 2 EL, guessed' &&
      batter.lines[2].amount === undefined &&
      same(brown.yield.amount, { value: 200, unit: 'g' }),
    `${label}: the guessed line keeps "guessed" and "2 EL" in its note, open; the yield is kept`,
  );
  check(
    same(await page.locator('.cook-result h3 + ul').first().locator('li').allTextContents(), [
      'butter: 2 EL',
    ]),
    `${label}: the result lists the guessed amount`,
  );
  await page.locator('.toast-action').click();
  await page.locator('.toast-text', { hasText: 'The import was undone.' }).waitFor();
  check(same(await ours(listAll, page), before), `${label}: Undo takes both recipes back`);
};
