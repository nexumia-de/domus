// Nutrients per 100 g from the FoodData Central food itself, and the values a parent can honestly
// carry. Pure: no file access, no clock. Rules in docs/ingredient-catalogue.md (Nutrition); change
// both together. No number is typed here: every value is read from the dataset.

/**
 * The nutrients taken from a food: the key in the catalogue, the FDC nutrient number and the unit
 * the dataset states (checked: a food whose unit differs gives no nutrition). `core` nutrients must
 * all be present for a row to carry nutrition; fibre and sodium may be missing (unknown, not zero).
 */
export const NUTRIENTS = [
  { key: 'kcal', number: '208', unit: 'kcal', core: true },
  { key: 'kJ', number: '268', unit: 'kJ', core: true },
  { key: 'proteinG', number: '203', unit: 'g', core: true },
  { key: 'fatG', number: '204', unit: 'g', core: true },
  { key: 'carbohydrateG', number: '205', unit: 'g', core: true },
  { key: 'fibreG', number: '291', unit: 'g', core: false },
  { key: 'sodiumMg', number: '307', unit: 'mg', core: false },
];

/** Parents take a nutrient when the values below agree within this ratio (as for density) ... */
export const NUTRIENT_AGREEMENT = 1.05;
/** ... or differ by at most this much (the step of the display rounding: 5 kcal, 0.5 g, 5 mg). */
export const NUTRIENT_ABSOLUTE = {
  kcal: 5,
  kJ: 20,
  proteinG: 0.5,
  fatG: 0.5,
  carbohydrateG: 0.5,
  fibreG: 0.5,
  sodiumMg: 5,
};
const MAX_SOURCE = 500;

const round3 = (value) => Number(value.toFixed(3));

/**
 * The nutrients per 100 g of a food as `{ per100g }` (the FDC ID and release are in the row's
 * `x-fdc` and the envelope's `dataset`), or undefined when a core nutrient is
 * missing, negative or in another unit than expected.
 */
export const nutritionOf = (food) => {
  const byNumber = new Map();
  for (const n of food.foodNutrients ?? []) {
    if (typeof n.amount === 'number' && n.nutrient !== undefined)
      byNumber.set(n.nutrient.number, n);
  }
  const per100g = {};
  for (const { key, number, unit, core } of NUTRIENTS) {
    const found = byNumber.get(number);
    const ok = found !== undefined && found.nutrient.unitName === unit && found.amount >= 0;
    if (!ok) {
      if (core) return undefined;
      continue;
    }
    per100g[key] = round3(found.amount);
  }
  return { per100g };
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * The nutrition a parent takes from `members` (all food rows below it), or undefined. Energy,
 * protein, fat and carbohydrate must all agree among every row below; fibre and sodium are taken
 * when every row has them and they agree. The value is the median.
 */
export const agreedNutrition = (members) => {
  if (members.length < 2 || members.some((row) => row['x-nutrition'] === undefined))
    return undefined;
  const per100g = {};
  for (const { key, core } of NUTRIENTS) {
    const values = members.map((row) => row['x-nutrition'].per100g[key]);
    const agrees =
      values.every((v) => v !== undefined) &&
      (Math.max(...values) - Math.min(...values) <= NUTRIENT_ABSOLUTE[key] ||
        Math.max(...values) / Math.min(...values) <= NUTRIENT_AGREEMENT);
    if (agrees) per100g[key] = round3(median(values));
    else if (core) return undefined;
  }
  const source = `Derived by tools/catalogue/build.mjs from the ${members.length} food rows below this entry: each nutrient listed agrees in all of them (ratio of largest to smallest at most ${NUTRIENT_AGREEMENT}, or difference at most ${NUTRIENT_ABSOLUTE.kcal} kcal, ${NUTRIENT_ABSOLUTE.kJ} kJ, ${NUTRIENT_ABSOLUTE.proteinG} g or ${NUTRIENT_ABSOLUTE.sodiumMg} mg); value = median`;
  return source.length > MAX_SOURCE ? undefined : { per100g, source };
};
