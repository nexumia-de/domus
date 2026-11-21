// The nutrition section of a classic in a browser: closed behind a tap, the rounded figures per
// portion as the engine gives them (computed here by the engine from the shipped catalogue, not typed
// in), the coverage in words, the data source, and no verdict. Then two variants of the fictional
// pan dish: one whose butter line names the butter group (counted with its usual member, and the
// section says so), and one whose oil is not in the catalogue (no figures, and the section says
// which ingredient keeps them back). Called from classics.mjs.
import { file } from './catalogue-helpers.mjs';
import { content } from './classics-fixture.mjs';
import { check } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { engine } from './notebook-fixture.mjs';

const records = new Map(file.ingredients.map((r) => [r.id, r]));
const find = (id) => {
  const r = records.get(id);
  if (r === undefined) return undefined;
  return {
    ...(r.parentId ? { parentId: r.parentId } : {}),
    ...(r.densityGPerMl ? { densityGPerMl: r.densityGPerMl.value } : {}),
    ...(r.unitWeightG ? { unitWeightG: r.unitWeightG.value } : {}),
    ...(r['x-nutrition'] ? { nutrition: r['x-nutrition'].per100g } : {}),
    ...(r['x-group']?.usual ? { usualId: r['x-group'].usual.id } : {}),
  };
};
const categoryOf = (id) => {
  for (let r = records.get(id); r !== undefined; r = records.get(r.parentId)) {
    const c = r['x-fdc']?.category ?? r['x-group']?.category;
    if (c !== undefined) return c;
  }
  return undefined;
};

/** What the engine says for a classic and some portions: rounded figures, coverage and `shown`. */
export const expectedNutrition = (classic, portions) => {
  const derived = engine.deriveClassic(classic, { portions, lang: 'en' });
  if (!derived.ok) throw new Error(`derive: ${derived.error.code}`);
  const ids = [
    ...new Set(
      [...derived.dish.slots, ...derived.components.flatMap((c) => c.lines)]
        .filter((l) => l.ref?.kind === 'ingredient')
        .map((l) => l.ref.id),
    ),
  ];
  const facts = {};
  const nutrition = {};
  for (const id of ids) {
    const figures = engine.lineFigures(id, find);
    facts[id] = figures.facts;
    if (figures.nutrition) nutrition[id] = figures.nutrition;
  }
  const seasonings = ids.filter((id) => categoryOf(id) === 'Spices and Herbs');
  const done = engine.dishNutrition(derived, { facts, nutrition, seasonings });
  if (!done.ok) throw new Error(`nutrition: ${done.error.code}`);
  const rounded = engine.roundNutrition(done.perPortion);
  if (!rounded.ok) throw new Error(`round: ${rounded.error.code}`);
  return { rounded: rounded.rounded, coverage: done.coverage, shown: done.shown };
};

/** Opens the section on the dish screen and checks it; leaves it open for the layout checks. */
export const nutritionSection = async (page, classic, label) => {
  const block = page.locator('.nutrition-block');
  const summary = block.locator('summary').first();
  check((await summary.innerText()) === 'Nutrition per portion', `${label}: the section is named`);
  check(
    (await block.getAttribute('open')) === null,
    `${label}: nutrition is behind a tap, like the source`,
  );
  await summary.click();
  const want = expectedNutrition(classic, 2);
  const { rounded: r, coverage } = want;
  check(want.shown.figures, `${label}: the example dish has figures to show`);
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
  check(
    (await block.innerText()).includes('Raw figures for a cooked dish'),
    `${label}: the figures say what they are not`,
  );
  const more = block.locator('.nutrition-more');
  check(
    (await more.getAttribute('open')) === null &&
      !(await block.innerText()).includes('Not counted:') &&
      !(await block.innerText()).includes('21 CFR'),
    `${label}: what was not counted and the rounding rule are behind a second tap`,
  );
  await more.locator('summary').click();
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
  await variants(page, classic, label);
};

/** The pan dish with one line changed, as its own content. */
const variant = (classic, id, change) => {
  const dish = JSON.parse(JSON.stringify(classic));
  dish.id = id;
  for (const component of dish.components ?? []) {
    component.lines = component.lines.map((line) => change(line));
  }
  return dish;
};

/** Opens a variant dish in a new page of the same context, with the section and its details open. */
const openVariant = async (page, dish) => {
  const other = await page.context().newPage();
  const data = { ...content, classics: [...content.classics, dish] };
  await other.addInitScript((d) => {
    globalThis.__culinaContent = d;
  }, data);
  const origin = new URL(page.url()).origin;
  await other.goto(`${origin}/?no-sw&e2e-store&e2e-content#/classic/${dish.id}`);
  await other.getByRole('heading', { level: 1 }).first().waitFor();
  const block = other.locator('.nutrition-block');
  await block.locator('summary').first().click();
  await block.locator('.nutrition-more summary').click();
  return { other, block };
};

const variants = async (page, classic, label) => {
  // The butter line names the butter group: counted with its usual member, butter without salt.
  const grouped = variant(classic, 'example-pan-dish-group', (line) =>
    line.ref?.id === 'fdc-173410'
      ? { ...line, ref: { kind: 'ingredient', id: 'fdc-group-butter' } }
      : line,
  );
  const g = await openVariant(page, grouped);
  const gWant = expectedNutrition(grouped, 2);
  const gText = (await g.block.innerText()).replace(/\s+/g, ' ');
  check(
    gWant.shown.figures &&
      (await g.block.locator('.nutrition-list dd').first().innerText()) ===
        `${gWant.rounded.kcal} kcal / ${gWant.rounded.kJ} kJ`,
    `${label}: a line naming the butter group is counted, with the engine's figure`,
  );
  check(
    gText.includes('Where the recipe names no kind, the usual one is counted:') &&
      gText.includes('as Butter, without salt'),
    `${label}: the section names the usual kind it counted`,
  );
  const o = await overflow(g.other);
  check(o.scroll <= 0 && o.wide.length === 0, `${label} group variant: no horizontal scroll`);
  const small = await smallTargets(g.other);
  check(small.length === 0, `${label} group variant: targets at least 44 x 44 ${small.join('; ')}`);
  await g.other.close();

  // The oil is not in the catalogue: no figures, and the section names it.
  const hidden = variant(classic, 'example-pan-dish-hidden', (line) => {
    if (line.ref?.id !== 'fdc-171413') return line;
    const rest = { ...line };
    delete rest.ref;
    return { ...rest, wanted: { en: 'Example oil', de: 'Beispielöl' } };
  });
  const h = await openVariant(page, hidden);
  const hWant = expectedNutrition(hidden, 2);
  const hText = (await h.block.innerText()).replace(/\s+/g, ' ');
  check(
    !hWant.shown.figures && (await h.block.locator('.nutrition-list').count()) === 0,
    `${label}: with the oil left out there are no figures`,
  );
  check(
    hText.includes(
      'No figures are shown: Example oil cannot be counted, and a total without them would mislead.',
    ) &&
      hText.includes(`Counted ${hWant.coverage.counted} of ${hWant.coverage.total} ingredients.`),
    `${label}: the section says which ingredient keeps the figures back, and what is counted`,
  );
  check(!/\d+ kcal/.test(hText), `${label}: no energy figure at all when it would mislead`);
  await h.other.close();
};
