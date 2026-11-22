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
  tooFew: 'Nutrition cannot be worked out: too few ingredients have an amount and nutrient data.',
  notShownLeftOut: (list: string): string =>
    `No figures are shown: ${list} cannot be counted, and a total without them would mislead.`,
  asUsual: (list: string): string =>
    `Where the recipe names no kind, the usual one is counted: ${list}.`,
  usualItem: (name: string, usual: string): string => `${name} as ${usual}`,
  seasoningsNote:
    'Left out of the figures: seasonings, water and foods of at most 50 kcal per 100 g; they are named below.',
  limits:
    'Raw figures for a cooked dish: no frying fat taken up, no losses; old sources give rough amounts.',
  moreSummary: 'What was left out, and how it is counted',
  reasons: {
    wanted: 'no catalogue entry',
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
  notALabel: 'A help for your own kitchen, not a nutrition label for selling food.',
};
