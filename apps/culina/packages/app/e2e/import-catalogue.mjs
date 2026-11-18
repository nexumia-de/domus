// Importing a Cooklang file into an empty notebook, offline under the service worker: a name is
// matched to a catalogue food, one to a catalogue parent, one is created new; saving adopts the
// entries with their parent chains and the lines point at them; leaving adopts nothing.
import { chainOf, file as catalogueFile, idsWithChains, rowNamed } from './catalogue-helpers.mjs';
import { layout } from './editor-helpers.mjs';
import { file, listAll, same } from './exchange-fixture.mjs';
import { check, watch } from './harness.mjs';
import { controlled } from './smoke.mjs';

const label = 'import catalogue';
const FOOD = rowNamed('Wheat flour, white, bread, enriched'); // a food with a parent chain
const PARENT = rowNamed('Butter'); // a parent: a generated group
const COOK = `---
title: Catalogue dough
---

Mix @white bread wheat flour{200%g}, @butter{100%g} and @saffron{1%pinch}.
`;
const SAVE = 'Save as version 1';

const names = async (page) => (await listAll(page)).ingredients.map((r) => r.id).sort();

const complete = async (page) => {
  await page.locator('input[type=file]').setInputFiles(file('dough.cook', COOK));
  await page.getByText('Complete the recipe').waitFor();
};

export const importCatalogue = async (browser, server) => {
  const { origin } = server;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?e2e-store#/settings/import`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();

  await complete(page);
  const foodSelect = page.getByLabel('Ingredient for white bread wheat flour');
  const butterSelect = page.getByLabel('Ingredient for butter');
  check(
    (await foodSelect.inputValue()) === '' &&
      (await butterSelect.inputValue()) === `ingredient:${PARENT.id}` &&
      (await page.getByLabel('Ingredient for saffron').inputValue()) === '',
    `${label}: an empty notebook preselects the catalogue's exact parent; a close food and the unknown name stay open`,
  );
  const foodOptions = await foodSelect.locator('option').allTextContents();
  check(
    foodOptions.includes(`${FOOD.name} (close, From the catalogue)`),
    `${label}: a close catalogue food is offered (${foodOptions.join(' | ')})`,
  );
  const butterOptions = await butterSelect.locator('option').allTextContents();
  check(
    butterOptions.includes('Butter (same name, From the catalogue)'),
    `${label}: a catalogue match shows its origin (${butterOptions.join(' | ')})`,
  );
  check((await names(page)).length === 0, `${label}: nothing is adopted while the user decides`);
  await layout(page, `${label} (names)`);

  // Leaving without saving adopts nothing.
  await page.getByRole('link', { name: /back/i }).first().click();
  await page.getByRole('heading', { level: 1 }).waitFor();
  check((await names(page)).length === 0, `${label}: leaving the step adopts nothing`);

  await page.goto(`${origin}/?e2e-store#/settings/import`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await complete(page);
  await page
    .getByLabel('Ingredient for white bread wheat flour')
    .selectOption(`ingredient:${FOOD.id}`);
  await page.getByLabel('Ingredient for saffron').selectOption('new');
  await page.getByRole('button', { name: SAVE }).click();
  await page.locator('.cook-result').waitFor();
  const all = await listAll(page);
  const saffron = all.ingredients.find((r) => r.name === 'saffron');
  const expected = [...idsWithChains(FOOD, PARENT), saffron?.id].sort();
  check(
    saffron !== undefined && same(await names(page), expected),
    `${label}: saving adopts the entries with their parent chains and the new ingredient`,
  );
  check(
    chainOf(FOOD).length > 0 &&
      all.ingredients.find((r) => r.id === FOOD.id)?.parentId === FOOD.parentId,
    `${label}: the adopted food keeps its parent`,
  );
  const dough = all.components.find((c) => c.name === 'Catalogue dough');
  check(
    same(
      dough?.lines.map((l) => l.ref.id),
      [FOOD.id, PARENT.id, saffron?.id],
    ),
    `${label}: the lines point at the adopted records`,
  );
  check(
    catalogueFile.ingredients.length > 0 && all.ingredients.length === expected.length,
    `${label}: nothing else was adopted`,
  );
  await layout(page, `${label} (saved)`);
  check(
    problems.length === 0,
    `${label}: no console error, CSP violation or foreign request${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};
