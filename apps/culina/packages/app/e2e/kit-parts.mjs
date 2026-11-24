// A sauce is a part, and the Notebook holds what is the user's: in a browser, in German, on the
// real shipped files and an empty notebook. Cook lists 113 dishes (102 recipes and 11 frames) and no alioli; the Components
// list has it; the Notebook's Dishes list no shipped dish and say where the shipped ones are.
// Chromium at 360 px; no real phone.
import { check, watch } from './harness.mjs';
import { layout, open } from './editor-helpers.mjs';

export const kitParts = async (browser, server) => {
  const label = '360px kit parts (de)';
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    locale: 'de-DE',
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await open(page, server.origin, 'cook');
  await page.locator('.dish-row').first().waitFor();
  const cook = await page.locator('.dish-row').allInnerTexts();
  check(
    cook.length === 113 &&
      !cook.some((row) =>
        // The name is the row's first line. A dish may name a sauce it is made with (the
        // coleslaw is "Krautsalat mit Mayonnaise"); only a row that is the sauce itself counts.
        /^(Alioli|Mayonnaise|Holländische Sauce|Béchamelsauce \(Balsamella\)|Spargelsauce)/.test(
          row,
        ),
      ),
    `${label}: Cook lists 113 dishes (102 recipes and 11 frames) and none of the sauces that are bases (${cook.length})`,
  );
  check(
    cook.some((row) => row.includes('Risotto')) && cook.some((row) => row.includes('Tortilla')),
    `${label}: a base that is no sauce and a plain dish are listed (controls)`,
  );
  await open(page, server.origin, 'components');
  await page.locator('.notebook-row-shipped').first().waitFor();
  const parts = await page.locator('.notebook-row-shipped .entry-name').allInnerTexts();
  check(
    parts.some((name) => name.trim() === 'Alioli'),
    `${label}: Alioli is among the shipped components`,
  );
  await open(page, server.origin, 'dishes');
  const empty = page.locator('.dishes-pane .empty');
  await empty.waitFor();
  check(
    (await page.locator('.notebook-row-shipped').count()) === 0 &&
      (await page.getByLabel('Von').count()) === 0 &&
      (await empty.innerText()).includes('„Kochen“'),
    `${label}: the Notebook's Dishes list no shipped dish and name Cook as the place for them`,
  );
  await layout(page, label);
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  // A frame: the app's own composition. Its source section names every part with where it comes
  // from, and it can be kept, since no part has a line the catalogue lacks.
  await open(page, server.origin, 'classic/tacos');
  await page.getByRole('heading', { level: 1, name: 'Tacos' }).waitFor();
  check(
    (await page.getByRole('button', { name: 'In mein Notizbuch übernehmen' }).count()) === 1,
    `${label} frame: the tacos can be kept in the notebook`,
  );
  // The fillings: the tacos are shown with the chicken, and the beans, their alternative, are no
  // part of the list until the cook chooses them (a first build listed both).
  const ingredients = async () => (await page.locator('.dish-results').innerText()).toString();
  const before = await ingredients();
  check(
    before.includes('Hähnchenbrust ohne Haut') && !before.includes('Pintobohnen'),
    `${label} frame: as shipped, the chicken is in the ingredients and the beans are not`,
  );
  const mainChoice = page.locator('.filling-choice select').first();
  check(
    (await page.locator('.filling-choice select').count()) === 2 &&
      (await mainChoice.locator('option').allInnerTexts()).join('|') ===
        'Gezupftes Hähnchen in Tomate und Chili|Bohnenmus aus der Pfanne',
    `${label} frame: two slots offer a choice, the main one the chicken and the beans`,
  );
  await mainChoice.selectOption({ label: 'Bohnenmus aus der Pfanne' });
  const after = await ingredients();
  check(
    after.includes('Pintobohnen') && !after.includes('Hähnchenbrust ohne Haut'),
    `${label} frame: with the beans chosen, they are in the ingredients and the chicken is not`,
  );
  check(
    (await page.locator('.filling-choice select').first().inputValue()) ===
      'frijoles-refritos-main' &&
      (await page.evaluate(() => document.activeElement?.tagName)) === 'SELECT',
    `${label} frame: the choice stays shown and keeps the focus`,
  );
  const sourceBlock = page.locator('.source-block');
  await sourceBlock.locator('summary').click();
  const sourceText = await sourceBlock.innerText();
  check(
    sourceText.includes('Von dieser App aus ihren eigenen Rezepten zusammengestellt') &&
      ['Weizentortillas', 'Bohnenmus aus der Pfanne', 'Guacamole', 'Frische Tomatensalsa'].every(
        (part) => sourceText.includes(`${part}: ein Rezept dieser App`),
      ) &&
      sourceText.includes(
        'Die Zusammenstellung als Ganzes hat niemand gelesen und niemand gekocht',
      ),
    `${label} frame: the source section says the app put it together, names each part of the dish as chosen and what nobody did`,
  );
  check(
    !sourceText.includes('Kichererbsen-Curry') &&
      !sourceText.includes('Gezupftes Hähnchen in Tomate und Chili: ein Rezept'),
    `${label} frame: controls, a recipe that is no part of the tacos, and the chicken that was swapped out, are not named`,
  );
  await context.close();
};
