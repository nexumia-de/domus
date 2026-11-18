// Expected calculator output, derived from the engine's vectors (packages/engine/vectors/templates)
// and from the seed templates (packages/engine/data/templates.json), not typed in by hand.
import { readFileSync } from 'node:fs';

const read = (path) =>
  JSON.parse(readFileSync(new URL(`../../engine/${path}`, import.meta.url), 'utf8'));
export const seed = read('data/templates.json');
export const templateById = (id) => seed.find((t) => t.id === id);

/** What the app shows for grams: the 1 g step (0.1 g below 10 g), halves up, e.g. 247.5 -> "248 g". */
export const shown = (g) => {
  const step = Math.abs(g) < 10 ? 0.1 : 1;
  return `${Number((Math.floor(g / step + 0.5 + 1e-9) * step).toFixed(1))} g`;
};

/**
 * The three ratios of the vector comparison: the vector's template is a seed template under
 * another name, `partsMatch` proves it, and `expected` is the vector's amounts as displayed.
 */
export const VECTOR_CASES = [
  { vector: 'scale-anchor-pasta-egg', template: 'pasta-dough', key: 'g' },
  { vector: 'scale-anchor-three-roles', template: 'pie-dough', key: 'g' },
  {
    vector: 'percent-ratio-to-bakers',
    template: 'bread-dough-ratio',
    key: 'pct',
    weighed: 'flour',
    grams: 100,
  },
].map((c) => {
  const v = read(`vectors/templates/${c.vector}.json`);
  const role = c.weighed ?? v.inputs.anchor.name;
  const grams = c.grams ?? v.inputs.anchor.g;
  const seedParts = templateById(c.template).parts.map((p) => [p.role, p.parts]);
  return {
    ...c,
    role,
    grams,
    partsMatch:
      JSON.stringify(Object.entries(v.inputs.template.parts)) === JSON.stringify(seedParts),
    expected: Object.fromEntries(Object.entries(v.expected[c.key]).map(([r, g]) => [r, shown(g)])),
  };
});

/** Plain arithmetic on a seed template: 500 g of flour in pie dough 3:2:1 (333.33.. and 166.66.. g). */
export const PIE_500 = {
  template: 'pie-dough',
  role: 'flour',
  grams: 500,
  expected: { flour: '500 g', fat: '333 g', water: '167 g' },
};
