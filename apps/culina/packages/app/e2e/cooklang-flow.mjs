// Cooklang in a browser: import a file written like the specification's examples, complete what
// it does not say (match one name, create one, leave one line open), save, see version 1 and the
// unmeasured lines; import it again as a variation and as a new family; export a component to
// Cooklang and import that file again.
import { check } from './harness.mjs';
import { engine } from './notebook-fixture.mjs';
import { layout } from './editor-helpers.mjs';
import { FLOUR, readDownload, same } from './exchange-fixture.mjs';

const label = '360px Cooklang';
const NOW = '2026-11-18T10:00:00.000Z';
const FILE_NAME = 'sauce.cook';
// Syntax from the specification's README: front matter, ingredients with quantities and units,
// fractions, cookware, a comment, a note, an ingredient without quantity, an unknown unit.
const COOK = `---
title: Imported sauce
yield: 400%g
---

Mix @flour{200%g} and @butter{1/2%cup} in a #pot{} -- stir well.

Add @saffron{1%pinch}, @salt and @flour{1%tbsp}.

> Taste before serving.
`;

const sauces = async (listAll, page) =>
  (await listAll(page)).components.filter((c) => c.name === 'Imported sauce');

const save = async (page) => {
  await page.getByRole('button', { name: 'Save as version 1' }).click();
  await page.locator('.cook-result').waitFor();
};

export const cooklang = async (page, origin, { openAt, file, listAll }) => {
  const nowQuery = `&e2e-now=${NOW}`;
  const pick = async (hash, upload) => {
    await openAt(page, origin, hash, nowQuery);
    await page.locator('input[type=file]').setInputFiles(upload);
  };

  // ---- import: complete the open points, then save
  await pick('settings/import', file(FILE_NAME, COOK));
  await page.getByText('Complete the recipe').waitFor();
  check(
    (await page.locator('.cook-head .note').innerText()) ===
      'Read from the file: 5 ingredient lines and 2 steps.',
    `${label}: what was read is reported`,
  );
  check(
    (await page.getByLabel('Ingredient for flour').inputValue()) === 'ingredient:flour' &&
      (await page.getByLabel('Ingredient for butter').inputValue()) === 'ingredient:butter' &&
      (await page.getByLabel('Ingredient for saffron').inputValue()) === '',
    `${label}: only names with an exact match are preselected`,
  );
  check(
    (await page.getByLabel('Ingredient for flour').count()) === 1,
    `${label}: a name used on two lines is asked once`,
  );
  check(
    (await page.getByRole('button', { name: 'Save as version 1' }).isDisabled()) &&
      (await page.getByText('1 ingredient name still needs a choice.').count()) === 1,
    `${label}: nothing can be saved while a name is open`,
  );
  // A close match is the user's to pick: "Bread flour" holds the word "flour".
  const flourOptions = await page
    .getByLabel('Ingredient for flour')
    .locator('option')
    .allTextContents();
  check(
    flourOptions.includes('Flour (same name)') && flourOptions.includes('Bread flour (close)'),
    `${label}: the exact and the close matches are offered (${flourOptions.join(' | ')})`,
  );
  await page.getByLabel('Ingredient for flour').selectOption(`ingredient:${FLOUR}`);
  await page.getByLabel('Ingredient for saffron').selectOption('new');
  check(
    await page.getByRole('button', { name: 'Save as version 1' }).isEnabled(),
    `${label}: every name decided, Save is possible`,
  );
  // The second flour line is a volume; flour has a density, so the ingredient can weigh it.
  const amounts = page.getByLabel('Amount of flour');
  check(
    (await amounts.first().locator('option').allTextContents()).join('|') ===
      'As written: 200 g|I weighed it|Leave open, keep as text',
    `${label}: a mass line offers as written, weighed and open`,
  );
  const options = await amounts.nth(1).locator('option').allTextContents();
  const grams = engine.toGrams({ value: 1, unit: 'tbsp' }, { densityGPerMl: 0.53 });
  check(
    options.includes(`From the ingredient: ${Number(grams.g.toPrecision(10))} g`),
    `${label}: a volume line can be weighed through the ingredient's density (${options.join(' | ')})`,
  );
  await amounts.nth(1).selectOption('facts');
  check(
    (await page.getByLabel('Amount of saffron').inputValue()) === 'open' &&
      (await page.getByLabel('Amount of salt').inputValue()) === 'open',
    `${label}: an unknown unit and a missing quantity default to open`,
  );
  await page.getByLabel('Role of flour (optional)').first().fill('flour');
  await page.getByLabel('Role of flour (optional)').nth(1).fill('Bad Role');
  check(
    (await page.getByRole('button', { name: 'Save as version 1' }).isDisabled()) &&
      (await page
        .getByText('A role is lower case letters and digits, joined by hyphens.')
        .count()) === 1,
    `${label}: a role that is not allowed blocks Save with a quiet sentence`,
  );
  await page.getByLabel('Role of flour (optional)').nth(1).fill('');
  await page.getByLabel('Percent base (optional)').selectOption('flour');
  await layout(page, `${label} (completion step)`);
  check((await sauces(listAll, page)).length === 0, `${label}: nothing is stored before Save`);
  await save(page);
  const after = await sauces(listAll, page);
  const first = after[0];
  check(after.length === 1, `${label}: one component was saved`);
  const unmeasured = await page.locator('.cook-result li').allTextContents();
  check(
    same(unmeasured, ['saffron (1 pinch)', 'salt']),
    `${label}: the lines kept without an amount are reported (${unmeasured.join(', ')})`,
  );
  const ids = Object.fromEntries((await listAll(page)).ingredients.map((i) => [i.name, i.id]));
  check(
    first.version.family === first.id &&
      first.version.date === '2026-11-18' &&
      first.version.change === `Imported from ${FILE_NAME}` &&
      first.version.parent === undefined &&
      first.percentBase === 'flour' &&
      same(first.yield, { amount: { value: 400, unit: 'g' }, source: 'user' }),
    `${label}: version 1 of a new family, dated by the clock, change naming the file`,
  );
  check(
    same(
      first.lines.map((l) => [l.ref.id, l.amount, l.role, l.note]),
      [
        [FLOUR, { value: 200, unit: 'g' }, 'flour', undefined],
        ['butter', { value: 0.5, unit: 'cup' }, undefined, undefined],
        [ids.saffron, undefined, undefined, '1 pinch'],
        ['salt', undefined, undefined, undefined],
        [FLOUR, { value: Number(grams.g.toPrecision(10)), unit: 'g' }, undefined, '1 tbsp'],
      ],
    ) &&
      same(first.method, [
        'Mix flour and butter in a pot',
        'Add saffron, salt and flour.',
        'Taste before serving.',
      ]),
    `${label}: lines, amounts, the unmeasured lines as text and the steps are as decided`,
  );
  check(
    (await page.locator('.toast-text').innerText()) === 'Imported Imported sauce.',
    `${label}: the toast offers Undo for the import`,
  );
  await page.getByRole('link', { name: 'Open the component' }).click();
  await page.locator('.version-line').waitFor();
  check(
    (await page.locator('.version-line').innerText()).startsWith('Version 1 · '),
    `${label}: the component opens as version 1`,
  );
  await layout(page, `${label} (imported component)`);

  // ---- the same file again: a variation, then a new family; nothing is overwritten
  await pick('settings/import', file(FILE_NAME, COOK));
  await page.getByText('Complete the recipe').waitFor();
  check(
    (await page.getByLabel('Ingredient for saffron').inputValue()) === `ingredient:${ids.saffron}`,
    `${label}: the ingredients created before are matched exactly the second time`,
  );
  await page.getByLabel('A variation of Imported sauce').check();
  await save(page);
  let all = await sauces(listAll, page);
  const variation = all.find((c) => c.id !== first.id);
  check(
    all.length === 2 &&
      variation.version.parent === first.id &&
      variation.version.family === variation.id &&
      same(
        all.find((c) => c.id === first.id),
        first,
      ),
    `${label}: importing again makes a variation, the first import is untouched`,
  );
  await pick('settings/import', file(FILE_NAME, COOK));
  await page.getByText('Complete the recipe').waitFor();
  await save(page);
  all = await sauces(listAll, page);
  check(
    all.length === 3 &&
      new Set(all.map((c) => c.version.family)).size === 3 &&
      same(
        all.find((c) => c.id === first.id),
        first,
      ),
    `${label}: and a new family the third time, nothing overwritten`,
  );

  // ---- export a component to Cooklang, then import that file again
  await openAt(page, origin, `components/${first.id}`, nowQuery);
  await page.locator('.version-line').waitFor();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export as Cooklang' }).click(),
  ]);
  const text = await readDownload(download);
  const sentence = await page.locator('.cooklang-export [role=status]').innerText();
  check(
    download.suggestedFilename() === 'Imported-sauce.cook' &&
      text.startsWith('---\ntitle: Imported sauce\nyield: 400%g\n---\n') &&
      text.includes('@Bread flour{200%g}'),
    `${label}: the file is named after the component and starts with its front matter`,
  );
  check(
    sentence.startsWith('Saved Imported-sauce.cook. Not in the file: ') &&
      sentence.includes('roles') &&
      sentence.includes('version history'),
    `${label}: the sentence says what the file cannot carry (${sentence})`,
  );
  await layout(page, `${label} (Cooklang export)`);
  await pick('settings/import', file('Imported-sauce.cook', text));
  await page.getByText('Complete the recipe').waitFor();
  for (const key of ['Bread flour', 'Butter', 'saffron', 'salt']) {
    const select = page.getByLabel(`Ingredient for ${key}`);
    check((await select.inputValue()) !== '', `${label}: re-import: ${key} is matched exactly`);
  }
  const refs = page.getByLabel(/^Amount of /);
  for (let i = 0; i < (await refs.count()); i++) {
    const select = refs.nth(i);
    const modes = await select.locator('option').evaluateAll((o) => o.map((x) => x.value));
    await select.selectOption(modes.includes('given') ? 'given' : 'open');
  }
  await save(page);
  all = await sauces(listAll, page);
  const again = all.find(
    (c) =>
      ![first.id, variation.id].includes(c.id) &&
      c.version.family === c.id &&
      c.version.change === 'Imported from Imported-sauce.cook',
  );
  check(
    again !== undefined &&
      same(
        again.lines,
        first.lines.map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'role'))),
      ),
    `${label}: exporting to Cooklang and importing it again gives the same lines, minus the roles Cooklang cannot carry`,
  );
};
