// A frame is judged on Cook by the filling the cook chose (docs/behaviour.md, Cook): in English, on
// the real shipped files and an empty notebook. The Japanese set meal is shipped with salmon; with
// the omelette chosen on its page, the filter "Without meat and fish" lists it on Cook. Controls:
// before the choice the filter leaves it out, the tacos' row and their place under the filter do
// not change, and a frame without meat (the rice bowl) is listed throughout. Chromium at 360 px;
// no real phone. Not proved here: "Only with what I have" and "Use up first" (unit tests,
// test/frame-choice-list.test.ts), and that a reload forgets the choice (it is in memory only).
import { check, watch } from './harness.mjs';
import { open } from './editor-helpers.mjs';

const MEAL = 'Japanese set meal';
const TACOS = 'Tacos';
const BOWL = 'Rice bowl';

const rows = (page) => page.locator('.dish-rows .dish-row');
const rowText = (page, name) =>
  page.locator('.dish-rows .dish-row', { hasText: name }).first().innerText();
const listed = async (page, name) =>
  (await page.locator('.dish-rows .entry-name').allInnerTexts()).some((n) => n.startsWith(name));
const openFilter = async (page) => {
  const fold = page.locator('details.dish-filter-fold');
  if ((await fold.count()) > 0 && !(await fold.evaluate((d) => d.open)))
    await fold.locator('summary').click();
};
const meatFree = async (page, on) => {
  await openFilter(page);
  const tick = page.getByLabel('Without meat and fish');
  if (on) await tick.check();
  else await tick.uncheck();
};

export const frameChoice = async (browser, server) => {
  const label = '360px frame choice';
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    locale: 'en-US',
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await open(page, server.origin, 'cook');
  await rows(page).first().waitFor();
  const mealBefore = await rowText(page, MEAL);
  const tacosBefore = await rowText(page, TACOS);
  await meatFree(page, true);
  check(
    !(await listed(page, MEAL)) && !(await listed(page, TACOS)) && (await listed(page, BOWL)),
    `${label}: as shipped, "Without meat and fish" leaves out the set meal (salmon) and the tacos, and lists the rice bowl (control)`,
  );
  await meatFree(page, false);

  await page.locator('.dish-rows .dish-row', { hasText: MEAL }).first().click();
  await page.getByRole('heading', { level: 1, name: new RegExp(`^${MEAL}`) }).waitFor();
  await page.locator('.filling-choice select').first().selectOption('tamagoyaki-omelette');
  check(
    (await page.locator('main').innerText()).includes('Without meat and fish'),
    `${label}: with the omelette chosen, the set meal's page says "Without meat and fish"`,
  );
  await page.goBack();
  await rows(page).first().waitFor();
  const mealAfter = await rowText(page, MEAL);
  check(
    mealAfter === mealBefore && (await rowText(page, TACOS)) === tacosBefore,
    `${label}: back on Cook, the rows say what they said (course and cuisine; the web row names no meat) (${mealAfter.replace(/\n/g, ' / ')})`,
  );
  await meatFree(page, true);
  check(
    (await listed(page, MEAL)) && !(await listed(page, TACOS)) && (await listed(page, BOWL)),
    `${label}: back on Cook, "Without meat and fish" lists the set meal as chosen; the tacos stay out and the rice bowl in (controls)`,
  );
  await meatFree(page, false);
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};
