// More editor checks: a recipe from a ratio card, the dish editor, desktop layout.
import { check, watch } from './harness.mjs';
import { shown, engine } from './notebook-fixture.mjs';
import { formReady, layout, listStore, noFieldFocused, open } from './editor-helpers.mjs';
import { seed } from './seed.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const CARD = 'ratios/bread-dough-bakers-percent';

const fromRatio = async (page, origin) => {
  const label = '360px ratio to editor';
  await open(page, origin, CARD);
  await page.locator('.calc input.field').fill('500');
  const results = await page
    .locator('.amounts tbody tr')
    .evaluateAll((rows) =>
      rows.map((r) => [r.children[0].textContent.trim(), r.children[1].textContent.trim()]),
    );
  await page.getByRole('link', { name: 'Make a recipe from this ratio' }).click();
  await formReady(page);
  check(
    page.url().endsWith('#/components/new'),
    `${label}: the card opens the new component editor`,
  );
  const lines = await page.evaluate(() =>
    [...document.querySelectorAll('.component-editor .line-edit')].map((li) => [
      li.querySelector('.pick-name').textContent,
      li.querySelector('input.field').value,
    ]),
  );
  check(
    lines.length === results.length &&
      lines.every(([, amount], i) => `${amount} g` === results[i][1]),
    `${label}: one line per role, prefilled with the calculator amounts ${JSON.stringify(results)}`,
  );
  check(
    lines.every(([name]) => name === 'Choose an ingredient'),
    `${label}: the ingredient of each line is still to be picked`,
  );
  check(
    (await page.locator('.ratio-info li').count()) > 0 ||
      (await page.locator('.ratio-info').count()) === 1,
    `${label}: the ratio range is shown as information`,
  );
  // Percent entry is possible at once: the anchor line is the reference.
  await page.getByLabel('Percent of a reference').check();
  const refValue = await page.getByLabel('Reference ingredient (100 %)').inputValue();
  check(refValue !== '', `${label}: the anchor role is the reference in percent entry`);
  await page.getByLabel('Name', { exact: true }).fill('From a ratio');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  check(
    (await page.locator('.line-edit .field-error').first().innerText()).includes(
      'Choose an ingredient for line 1 to save it.',
    ),
    `${label}: saving says quietly that each line needs its ingredient`,
  );
  await page.getByRole('button', { name: 'Discard changes' }).click();
};

const dish = async (page, origin) => {
  const label = '360px dish editor';
  await seed(page, origin);
  await open(page, origin, 'dishes');
  await page.getByRole('link', { name: 'Add a dish' }).click();
  await formReady(page);
  check(page.url().endsWith('#/dishes/new'), `${label}: Add a dish opens #/dishes/new`);
  check(await noFieldFocused(page), `${label}: no field is focused when the editor opens`);
  await layout(page, `${label} (empty)`);
  await page.getByLabel('Name', { exact: true }).fill('My plate');
  await page.getByLabel('Portions', { exact: true }).fill('3');
  const course = page.getByLabel('Course', { exact: true });
  const cuisine = page.getByLabel('Cuisine', { exact: true });
  const kindBoxes = [await course.boundingBox(), await cuisine.boundingBox()];
  const firstChoices = [
    await course.locator('option').first().textContent(),
    await cuisine.locator('option').first().textContent(),
  ];
  check(
    kindBoxes.every((b) => b !== null && b.height >= 44 && b.x + b.width <= 360) &&
      same(firstChoices, ['Not stated', 'Not stated']) &&
      (await course.inputValue()) === '' &&
      (await cuisine.inputValue()) === '',
    `${label}: Course and Cuisine are selects of 44 px that start at "Not stated" (${JSON.stringify(kindBoxes)})`,
  );
  await course.selectOption({ label: 'Main course' });
  await cuisine.selectOption({ label: 'Italian' });
  await page.getByRole('button', { name: 'Add a slot' }).click();
  await page.getByLabel('Search your notebook').fill('herb oil');
  await page.getByRole('button', { name: /Example: Herb oil/ }).click();
  await page.getByLabel(/^Amount per portion/).fill('15');
  await page.getByLabel(/^Role, /).selectOption('garnish');
  await page.getByRole('button', { name: 'Add a slot' }).click();
  await page.getByLabel('Search your notebook').fill('parsley');
  await page.getByRole('button', { name: 'Parsley', exact: true }).click();
  // The cook's correction of the characters: a tick per character; one no rule gives is added.
  const creamy = page.locator('.dish-characters-edit input[data-character="creamy"]');
  const tickBox = await creamy.boundingBox();
  check(
    (await page.locator('.dish-characters-edit input[type="checkbox"]').count()) > 10 &&
      !(await creamy.isChecked()) &&
      tickBox !== null &&
      tickBox.height >= 44 &&
      tickBox.width >= 44 &&
      (await page.locator('.character-reset').isHidden()),
    `${label}: "What it is like" has a tick of 44 px per character, creamy not ticked for this plate, nothing to reset (${JSON.stringify(tickBox)})`,
  );
  await creamy.check();
  check(
    (await page.locator('.character-tick[data-corrected="added"]').textContent())?.includes(
      'added by you',
    ) === true &&
      (await creamy.evaluate((n) => n === document.activeElement)) &&
      (await page.locator('.character-reset').isVisible()),
    `${label}: a ticked character no rule gives says "added by you", keeps the focus and can be reset`,
  );
  await layout(page, `${label} (two slots)`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'My plate' }).waitFor();
  check(
    (await page.locator('.character-chip[data-character="creamy"]').count()) === 1,
    `${label}: the dish screen shows the added character as a chip`,
  );
  const [stored] = (await listStore(page, 'dishes')).filter((d) => d.name === 'My plate');
  check(
    stored.portions === 3 &&
      same(stored.slots[0], {
        role: 'garnish',
        ref: { kind: 'component', id: 'example-herb-oil' },
        amount: { value: 15, unit: 'g' },
      }) &&
      stored.slots[1].ref.id === 'parsley' &&
      stored.version.family === stored.id,
    `${label}: the dish stores its slots, the component with 15 g per portion`,
  );
  check(
    stored.course === 'main' &&
      stored.cuisine === 'it' &&
      same(stored.characters, { add: ['creamy'] }),
    `${label}: the dish stores course "main", cuisine "it" and the added character (${stored.course}, ${stored.cuisine}, ${JSON.stringify(stored.characters)})`,
  );
  // The one quiet line of both origins: course, cuisine, the meat flag where it is known, the origin.
  const kindLine = (await page.locator('.dish-quiet').textContent())?.trim();
  check(
    kindLine?.startsWith('Main course · Italian') === true && kindLine.endsWith('In my notebook'),
    `${label}: the dish screen shows course and cuisine in one quiet line (${kindLine})`,
  );
  const rows = await page
    .locator('.slots-table tbody tr')
    .evaluateAll((trs) =>
      trs.map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim())),
    );
  const g = engine.toGrams({ value: 15, unit: 'g' }).g;
  check(
    rows[0][1] === shown(g) && rows[0][2] === shown(g * 3),
    `${label}: the dish shows 15 g per portion and ${shown(g * 3)} in total (${JSON.stringify(rows[0])})`,
  );
  await page.getByRole('link', { name: 'Edit' }).click();
  await formReady(page);
  check(
    (await page.getByLabel('Name', { exact: true }).inputValue()) === 'My plate',
    `${label}: Edit opens the stored dish`,
  );
  check(
    (await page.getByLabel('Course', { exact: true }).inputValue()) === 'main' &&
      (await page.getByLabel('Cuisine', { exact: true }).inputValue()) === 'it',
    `${label}: Edit reads course and cuisine back into the selects`,
  );
  check(
    (await page.locator('.dish-characters-edit input[data-character="creamy"]').isChecked()) &&
      (await page.locator('.character-tick[data-corrected]').count()) === 1,
    `${label}: Edit reads the correction back: creamy ticked and marked as the one correction`,
  );
  await page.getByRole('button', { name: 'Move down, Line 1, Example: Herb oil' }).click();
  check(
    same(await page.locator('.slot-edit .pick-name').allTextContents(), [
      'Parsley',
      'Example: Herb oil',
    ]),
    `${label}: slots reorder with move buttons`,
  );
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByText('Deleted My plate').waitFor();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText('Restored My plate').waitFor();
  check(
    (await listStore(page, 'dishes')).some((d) => d.name === 'My plate'),
    `${label}: delete and Undo work for a dish`,
  );
};

const desktop = async (browser, origin) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await seed(page, origin);
  await open(page, origin, 'components/example-flat-dough/edit');
  await formReady(page);
  check(await noFieldFocused(page), '1000px editor: no field is focused when the editor opens');
  const o = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(o <= 0, '1000px editor: no horizontal scroll');
  const state = await page.evaluate(() => ({
    entry: document.querySelector('input[type=radio]:checked').parentElement.textContent,
    values: [...document.querySelectorAll('.line-edit input.field')].map((i) => i.value),
  }));
  check(
    state.entry === 'Percent of a reference' && same(state.values, ['500', '60', '2', '1']),
    `1000px editor: the example dough opens in percent entry (${JSON.stringify(state)})`,
  );
  check(
    problems.length === 0,
    `1000px editor: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

export const editorMore = async (browser, server) => {
  const origin = server.origin;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await fromRatio(page, origin);
  await dish(page, origin);
  check(
    problems.length === 0,
    `editor (ratio, dish): no console errors or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
  await desktop(browser, origin);
};
