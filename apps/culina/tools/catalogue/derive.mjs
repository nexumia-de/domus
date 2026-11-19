// The rules that turn one FoodData Central SR Legacy food into a catalogue row. Pure: no file
// access, no clock. Every rule is stated in docs/ingredient-catalogue.md; change both together.

/** Food categories a basic ingredient can come from. */
export const CATEGORIES = [
  'Baked Products',
  'Cereal Grains and Pasta',
  'Dairy and Egg Products',
  'Fats and Oils',
  'Fruits and Fruit Juices',
  'Legumes and Legume Products',
  'Nut and Seed Products',
  'Spices and Herbs',
  'Sweets',
  'Vegetables and Vegetable Products',
];

/** In these categories only foods described as raw are basic; elsewhere the exclusions decide. */
export const RAW_ONLY = [
  'Fruits and Fruit Juices',
  'Legumes and Legume Products',
  'Vegetables and Vegetable Products',
];

/** A food whose description names one of these words is processed or ready to eat, not basic. */
export const EXCLUDED_WORDS = [
  'babyfood',
  'baked',
  'boiled',
  'breaded',
  'candies',
  'canned',
  'commercial',
  'cooked',
  'dehydrated',
  'drained',
  'beverage',
  'dressing',
  'dry roasted',
  'fast foods',
  'fried',
  'frosting',
  'frozen',
  'filled',
  'imitation',
  'industrial',
  'juice',
  'oil-roasted',
  'pickled',
  'prepared',
  'process',
  'ready-to-',
  'ready to',
  'reconstituted',
  'restaurant',
  'seasoning mix',
  'roasted',
  'sauce',
  'shelf',
  'snacks',
  'steamed',
  'stewed',
  'spread',
  'substitute',
  'sweetener',
  'topping',
  'toasted',
  'unprepared',
  'with salt added',
];

/** A food named after a brand (a word of three or more capital letters) is not basic. */
const BRAND = /[A-Z]{3,}/;

/** In these categories only foods whose description starts with a listed head are basic. */
export const HEADS = {
  'Baked Products': ['Leavening agents'],
  Sweets: ['Cocoa', 'Honey', 'Molasses', 'Sugars', 'Syrups'],
};

export const VOLUME_UNITS = {
  cup: 'cup',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
};
/** Densities beyond these bounds are data errors for a food, not physics: the density is left out. */
export const DENSITY_BOUNDS = [0.05, 2.5];
/** Densities from different volume portions of one food must agree within this ratio. */
export const DENSITY_AGREEMENT = 1.1;

const PIECE = /^(clove|each|item|piece|fruit|head|leaf|pepper|pod|root|spear|stalk)( \([^)]*\))?$/;
const SIZE = /^(small|medium|large)( \(.*\))?$/;

const tokens = (description) => description.split(',').map((t) => t.trim().toLowerCase());

/** Whether the food is selected as a basic ingredient. */
export const isBasic = (food) => {
  const category = food.foodCategory?.description;
  if (!CATEGORIES.includes(category)) return false;
  const bare = food.description.replace(/\s*\([^)]*\)/g, '');
  if (BRAND.test(bare)) return false;
  const heads = HEADS[category];
  if (heads && !heads.some((h) => bare === h || bare.startsWith(`${h},`))) return false;
  const lower = bare.toLowerCase();
  if (EXCLUDED_WORDS.some((word) => lower.includes(word))) return false;
  if (RAW_ONLY.includes(category) && !tokens(food.description).includes('raw')) return false;
  return true;
};

const round = (value, digits) => Number(value.toFixed(digits));

/**
 * Density from the portions "1 cup", "1 tbsp", "1 tsp" (modifier exactly the unit word, any
 * amount). `mlOf` gives the millilitres of a unit. Returns undefined when there is none, when the
 * portions disagree, or when the result is outside DENSITY_BOUNDS. A named food (`extra.volume`,
 * from extras.json) also accepts the listed modifiers, each as `unit` times `per`.
 */
export const deriveDensity = (portions, mlOf, extra = {}) => {
  const found = [];
  for (const p of portions) {
    const text = (p.modifier ?? '').trim();
    const named = (extra.volume ?? []).find((v) => v.modifier === text);
    const unit = named === undefined ? VOLUME_UNITS[text] : named.unit;
    if (unit === undefined || !(p.amount > 0) || !(p.gramWeight > 0)) continue;
    const per = named?.per ?? 1;
    found.push({
      unit,
      text,
      per,
      amount: p.amount,
      grams: p.gramWeight,
      density: p.gramWeight / (p.amount * per * mlOf(unit)),
    });
  }
  if (found.length === 0) return undefined;
  const values = found.map((f) => f.density);
  if (Math.max(...values) / Math.min(...values) > DENSITY_AGREEMENT) return undefined;
  const best = ['cup', 'tbsp', 'tsp'].map((u) => found.find((f) => f.unit === u)).find(Boolean);
  const value = round(best.density, 3);
  if (value < DENSITY_BOUNDS[0] || value > DENSITY_BOUNDS[1]) return undefined;
  return {
    value,
    unit: best.unit,
    portion: `${best.amount} ${best.text} = ${best.grams} g`,
    ...(best.per === 1 ? {} : { equals: `1 ${best.text} = ${best.per} ${best.unit}` }),
  };
};

/**
 * Weight of one piece from a portion of amount 1 whose modifier is "medium", else the only
 * small/medium/large portion, else the only portion whose modifier is one piece word (clove, each,
 * item, piece, fruit, head, leaf, pepper, pod, root, spear, stalk), with or without a size in
 * parentheses. A named food (`extra.piece`) gives the exact modifier instead.
 */
export const deriveUnitWeight = (portions, extra = {}) => {
  const one = portions.filter((p) => p.amount === 1 && p.gramWeight > 0);
  const named = (rule) => one.filter((p) => rule((p.modifier ?? '').trim()));
  if (extra.piece !== undefined) {
    const exact = named((m) => m === extra.piece);
    if (exact.length !== 1) return undefined;
    return {
      value: round(exact[0].gramWeight, 3),
      portion: `1 ${exact[0].modifier.trim()} = ${exact[0].gramWeight} g`,
    };
  }
  const medium = named((m) => m === 'medium' || m.startsWith('medium ('));
  const sizes = named((m) => SIZE.test(m));
  const words = named((m) => PIECE.test(m));
  const pick = medium.length === 1 ? medium : sizes.length === 1 ? sizes : words;
  const only = pick.length === 1 && medium.length <= 1 ? pick[0] : undefined;
  if (only === undefined) return undefined;
  return {
    value: round(only.gramWeight, 3),
    portion: `1 ${only.modifier.trim()} = ${only.gramWeight} g`,
  };
};

/** The name shown: the description without parentheses and without the word raw. */
export const nameOf = (description) =>
  description
    .replace(/\s*\([^)]*\)/g, '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '' && t.toLowerCase() !== 'raw')
    .join(', ');
