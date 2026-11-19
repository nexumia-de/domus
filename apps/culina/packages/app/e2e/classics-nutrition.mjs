// The nutrition section of a classic in a browser: closed behind a tap, the rounded figures per
// portion as the engine gives them (computed here by the engine from the shipped catalogue, not typed
// in), the coverage in words, the data source, and no verdict. Called from classics.mjs.
import { file } from './catalogue-helpers.mjs';
import { check } from './harness.mjs';
import { engine } from './notebook-fixture.mjs';

const records = new Map(file.ingredients.map((r) => [r.id, r]));
const facts = Object.fromEntries(
  file.ingredients.map((r) => [
    r.id,
    {
      ...(r.densityGPerMl ? { densityGPerMl: r.densityGPerMl.value } : {}),
      ...(r.unitWeightG ? { unitWeightG: r.unitWeightG.value } : {}),
    },
  ]),
);
const nutrition = Object.fromEntries(
  [...records.values()]
    .filter((r) => r['x-nutrition'])
    .map((r) => [r.id, r['x-nutrition'].per100g]),
);

/** What the engine says for a classic and some portions: rounded figures and coverage. */
export const expectedNutrition = (classic, portions) => {
  const derived = engine.deriveClassic(classic, { portions, lang: 'en' });
  if (!derived.ok) throw new Error(`derive: ${derived.error.code}`);
  const done = engine.dishNutrition(derived, { facts, nutrition });
  if (!done.ok) throw new Error(`nutrition: ${done.error.code}`);
  const rounded = engine.roundNutrition(done.perPortion);
  if (!rounded.ok) throw new Error(`round: ${rounded.error.code}`);
  return { rounded: rounded.rounded, coverage: done.coverage };
};

/** Opens the section on the dish screen and checks it; leaves it open for the layout checks. */
export const nutritionSection = async (page, classic, label) => {
  const block = page.locator('.nutrition-block');
  const summary = block.locator('summary');
  check((await summary.innerText()) === 'Nutrition per portion', `${label}: the section is named`);
  check(
    (await block.getAttribute('open')) === null,
    `${label}: nutrition is behind a tap, like the source`,
  );
  await summary.click();
  const want = expectedNutrition(classic, 2);
  const { rounded: r, coverage } = want;
  const rows = Object.fromEntries(
    (await block.locator('.nutrition-list dt').allInnerTexts()).map((name, i) => [name, i]),
  );
  const values = await block.locator('.nutrition-list dd').allInnerTexts();
  const valueOf = (name) => values[rows[name]];
  check(
    valueOf('Energy') === `${r.kcal} kcal / ${r.kJ} kJ`,
    `${label}: energy is the engine's rounded figure (${valueOf('Energy')})`,
  );
  check(valueOf('Protein') === `${r.proteinG} g`, `${label}: protein is the engine's`);
  check(valueOf('Fat') === `${r.fatG} g`, `${label}: fat is the engine's`);
  check(
    valueOf('Carbohydrate') === `${r.carbohydrateG} g`,
    `${label}: carbohydrate is the engine's`,
  );
  if (r.fibreG !== undefined) check(valueOf('Fibre') === `${r.fibreG} g`, `${label}: fibre`);
  if (r.saltG !== undefined) check(valueOf('Salt') === `${r.saltG} g`, `${label}: salt`);
  const text = (await block.innerText()).replace(/\s+/g, ' ');
  check(
    text.includes(`Counted ${coverage.counted} of ${coverage.total} ingredients.`) &&
      text.includes('Not counted:') &&
      text.includes('(no amount)'),
    `${label}: the coverage says how many were counted and which were not`,
  );
  check(text.includes('USDA FoodData Central, SR Legacy'), `${label}: the data source is named`);
  check(
    !/healthy|too much|too little|high in|low in|daily|recommended|good for/i.test(text),
    `${label}: nutrition never judges`,
  );
  check(
    (await block.locator('[style*="color"], .good, .bad, .warn').count()) === 0,
    `${label}: no colour carries meaning in the section`,
  );
  await page.getByRole('button', { name: 'More portions' }).click();
  await page.getByRole('button', { name: 'More portions' }).click();
  check(
    (await block.innerText()).includes('One portion of a dish for 4 portions.') &&
      (await block.locator('.nutrition-list dd').first().innerText()) === valueOf('Energy'),
    `${label}: figures are per portion, the same for 4 portions`,
  );
  await page.getByLabel('Portions', { exact: true }).fill('2');
};
