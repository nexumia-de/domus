// Texts of the nutrition section of a classic: figures per portion, what they rest on, and where
// they come from. Wording never judges a dish: it states numbers and what was counted.

export const nutritionStrings = {
  heading: 'Nutrition per portion',
  portionsLine: (portions: number): string =>
    portions === 1
      ? 'One portion of a dish for 1 portion.'
      : `One portion of a dish for ${portions} portions.`,
  tableLabel: 'Figures per portion',
  energy: 'Energy',
  protein: 'Protein',
  fat: 'Fat',
  carbohydrate: 'Carbohydrate',
  fibre: 'Fibre',
  salt: 'Salt',
  energyValue: (kcal: string, kJ: string): string => `${kcal} kcal / ${kJ} kJ`,
  gramsValue: (g: string): string => `${g} g`,
  fibreNotShown: 'Fibre is not shown: an ingredient counted here has no fibre figure.',
  saltNotShown: 'Salt is not shown: an ingredient counted here has no sodium figure.',
  coverageAll: (total: number): string =>
    total === 1 ? 'Counted the 1 ingredient.' : `Counted all ${total} ingredients.`,
  coverageSome: (counted: number, total: number): string =>
    `Counted ${counted} of ${total} ingredients.`,
  notCounted: (list: string): string => `Not counted: ${list}.`,
  massShare: (percent: string): string =>
    `The counted ingredients make up ${percent} % of the weight where it is known.`,
  noneCounted: 'No ingredient could be counted, so there are no figures.',
  reasons: {
    wanted: 'not in the catalogue yet',
    'no-amount': 'no amount',
    'cannot-convert': 'weight not known',
    'no-nutrition': 'no nutrient data',
    optional: 'optional',
    'unknown-component': 'not found',
  },
  notCountedItem: (name: string, reason: string): string => `${name} (${reason})`,
  method: 'Amounts as the recipe gives them, raw; no cooking loss and no edible portion applied.',
  rounding: 'Rounded in the steps of 21 CFR 101.9(c), the US rule for nutrition labels.',
  source: 'Nutrients per 100 g: USDA FoodData Central, SR Legacy (public domain).',
  notALabel: 'Not a food label: anyone who sells food needs the label rules.',
};
