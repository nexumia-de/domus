// A sauce is a part, and the Notebook holds what is the user's: in a browser, in German, on the
// real shipped files and an empty notebook. Cook lists 98 dishes and no alioli; the Components
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
    cook.length === 98 &&
      !cook.some((row) =>
        // The name is the row's first line. A dish may name a sauce it is made with (the
        // coleslaw is "Krautsalat mit Mayonnaise"); only a row that is the sauce itself counts.
        /^(Alioli|Mayonnaise|Holländische Sauce|Béchamelsauce \(Balsamella\)|Spargelsauce)/.test(
          row,
        ),
      ),
    `${label}: Cook lists 98 dishes and none of the sauces that are bases (${cook.length})`,
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
  await context.close();
};
