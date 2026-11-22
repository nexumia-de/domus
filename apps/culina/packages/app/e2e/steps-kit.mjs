// The kit for own recipes in a browser: a component is built from steps (what is done, what goes
// in, time, a note), saved, shown as one line per step, and cooked step by step with the note of
// its skill; an edit keeps the steps. The shipped content is used, so "Searing" is a real note.
import { check, watch } from './harness.mjs';
import { addNewIngredient, formReady, layout, listStore, open } from './editor-helpers.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NAME = 'Kit stew';
const card = (page, n) => page.locator('.step-card').nth(n - 1);
const stepItems = (page) => page.locator('.steps-section .recipe-steps li').allInnerTexts();

const build = async (page, origin) => {
  const label = '360px kit';
  await open(page, origin, 'components/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill(NAME);
  await addNewIngredient(page, 'Beef', '', '500', 0);
  await addNewIngredient(page, 'Onion', '', '200', 1);
  check(
    (await page.getByRole('heading', { level: 2, name: 'Steps' }).count()) === 1 &&
      (await page.locator('.step-card').count()) === 0,
    `${label}: the editor has a Steps section, empty at first`,
  );

  // Step 1: a skill, one ingredient, a time and a note.
  await page.getByRole('button', { name: 'Add a step' }).click();
  const groups = await card(page, 1)
    .getByLabel('What is done')
    .locator('optgroup')
    .evaluateAll((nodes) => nodes.map((n) => [n.label, n.children.length]));
  check(
    groups.length === 2 &&
      groups[0][0] === 'Skills (with a note)' &&
      groups[0][1] > 30 &&
      groups[1][0] === 'Simple actions' &&
      groups[1][1] > 20,
    `${label}: the words are the skills and the simple actions (${JSON.stringify(groups)})`,
  );
  await card(page, 1).getByLabel('What is done').selectOption({ label: 'Searing' });
  check(
    same(await card(page, 1).locator('.step-uses .choice').allInnerTexts(), ['Beef', 'Onion']),
    `${label}: a step offers the lines of the component to tick`,
  );
  await card(page, 1).getByLabel('Beef').check();
  await card(page, 1).getByLabel('Time', { exact: true }).fill('10');
  await card(page, 1).getByLabel('Note (optional)').fill('until brown');

  // Step 2: a simple action. Step 3: left as it is, so Save leaves it out.
  await page.getByRole('button', { name: 'Add a step' }).click();
  await card(page, 2).getByLabel('What is done').selectOption({ label: 'Set aside' });
  await card(page, 2).getByLabel('Beef').check();
  await page.getByRole('button', { name: 'Add a step' }).click();
  await layout(page, `${label} (three step cards)`);

  // A line added after the steps shows in every step.
  await addNewIngredient(page, 'Cream', '', '100', 2);
  check(
    same(await card(page, 2).locator('.step-uses .choice').allInnerTexts(), [
      'Beef',
      'Onion',
      'Cream',
    ]) && (await card(page, 2).getByLabel('Beef').isChecked()),
    `${label}: a new line shows in the steps, and what was ticked stays ticked`,
  );

  // What cannot be stored is said at its step.
  await card(page, 3).getByLabel('Onion').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  check(
    (await card(page, 3).locator('.field-error').innerText()) ===
      'Step 3: choose what is done, or write a note, to save it.',
    `${label}: a step with lines and no word is named at the step`,
  );
  await card(page, 3).getByLabel('What is done').selectOption({ label: 'Braising' });
  await card(page, 3).getByLabel('Cream').check();
  await page.getByRole('button', { name: 'Add a step' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: NAME }).waitFor();

  check(
    same(await stepItems(page), [
      'Searing: Beef · 10 min · until brown',
      'Set aside: Beef',
      'Braising: Onion, Cream',
    ]),
    `${label}: the component shows one line per step (${(await stepItems(page)).join(' | ')})`,
  );
  const stored = (await listStore(page, 'components')).find((c) => c.name === NAME);
  check(
    same(stored?.steps, [
      {
        technique: 'sear',
        uses: ['l1'],
        time: { value: 10, unit: 'min' },
        note: 'until brown',
      },
      { action: 'set-aside', uses: ['l1'] },
      { technique: 'braise', uses: ['l2', 'l3'] },
    ]),
    `${label}: the steps are stored by word and line, without a text, the empty one left out (${JSON.stringify(stored?.steps)})`,
  );
  check(
    same(
      stored?.lines.map((l) => l.key),
      ['l1', 'l2', 'l3'],
    ),
    `${label}: the lines a step uses have a key`,
  );
  await layout(page, `${label} (component with steps)`);
};

const cook = async (page) => {
  const label = '360px kit cooking';
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 1 of 3' }).waitFor();
  check(/#\/components\/[^/]+\/cook$/.test(page.url()), `${label}: the route ends in /cook`);
  check(
    (await page.locator('.cook-step-text').innerText()) === 'Searing · until brown',
    `${label}: the step says what is done and the note`,
  );
  check(
    same(await page.locator('.cook-step .recipe-line').allInnerTexts(), ['500 g\nBeef']) ||
      same(await page.locator('.cook-step .recipe-line .recipe-name').allInnerTexts(), ['Beef']),
    `${label}: the step shows the line it uses`,
  );
  check(
    (await page.locator('.cook-step .recipe-amount').first().innerText()) === '500 g',
    `${label}: with its amount`,
  );
  check(await page.getByText('Time: 10 min').isVisible(), `${label}: and its time`);
  check(
    await page.getByRole('heading', { name: 'Technique: Searing' }).isVisible(),
    `${label}: the skill of the step shows its note`,
  );
  await layout(page, `${label} (step 1)`);
  await page.locator('.technique-note').getByRole('button', { name: 'I know this' }).click();
  await page.getByText('Marked as learned: Searing.').waitFor();
  check(
    (await page.getByRole('heading', { name: 'Technique: Searing' }).count()) === 0,
    `${label}: the note is gone after "I know this"`,
  );

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 2 of 3' }).waitFor();
  check(
    (await page.locator('.cook-step-text').innerText()) === 'Set aside' &&
      (await page.locator('.technique-note').count()) === 0,
    `${label}: a simple action names the step and shows no note`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('heading', { level: 2, name: 'Step 3 of 3' }).waitFor();
  check(
    await page.getByRole('heading', { name: 'Technique: Braising' }).isVisible(),
    `${label}: the next skill shows its note at its first step`,
  );
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('heading', { level: 2, name: 'That was the last step.' }).waitFor();
  await layout(page, `${label} (end)`);
  await page.locator('.cook-body').getByRole('link', { name: 'Back to the component' }).click();
  await page.getByRole('heading', { level: 1, name: NAME }).waitFor();
  check(true, `${label}: the end leads back to the component`);
};

const edit = async (page) => {
  const label = '360px kit editing';
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await formReady(page);
  check(
    same(
      await page
        .locator('.step-card')
        .evaluateAll((cards) => cards.map((c) => c.querySelector('select').value)),
      ['t:sear', 'a:set-aside', 't:braise'],
    ),
    `${label}: the editor opens with the stored steps`,
  );
  check(
    (await card(page, 1).getByLabel('Beef').isChecked()) &&
      !(await card(page, 1).getByLabel('Onion').isChecked()) &&
      (await card(page, 1).getByLabel('Note (optional)').inputValue()) === 'until brown' &&
      (await card(page, 1).getByLabel('Time', { exact: true }).inputValue()) === '10',
    `${label}: with their lines, time and note`,
  );
  await page.getByRole('button', { name: 'Move step 2 up' }).click();
  check(
    await page.evaluate(
      () =>
        document.activeElement ===
        document.querySelectorAll('.step-card')[0].querySelector('select'),
    ),
    `${label}: after a move the focus is on the step that moved`,
  );
  await page.getByRole('button', { name: 'Remove step 3' }).click();
  check((await page.locator('.step-card').count()) === 2, `${label}: a step can be removed`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: NAME }).waitFor();
  check(
    same(await stepItems(page), ['Set aside: Beef', 'Searing: Beef · 10 min · until brown']),
    `${label}: the new order and the removal are stored (${(await stepItems(page)).join(' | ')})`,
  );
};

export const stepsKit = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await build(page, server.origin);
  await cook(page);
  await edit(page);
  check(
    problems.length === 0,
    `360px kit: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};
