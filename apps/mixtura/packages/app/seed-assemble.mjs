// Assembles the seed file the app loads (seed/seed.json) from the engine
// package: the converted Bar Assistant ingredients and specs, Mixtura's own
// additions (data/mixtura/, kept apart so the converter output stays
// reproducible), the vocabulary, the six root templates and the variants for
// the alcohol classes. Used by build.mjs and by the tests; the result is read-only
// data (docs/seed-data.md, docs/store.md).
import { readFileSync } from 'node:fs';
import { ROOT_TEMPLATES, VARIANT_TEMPLATES } from '@mixtura/engine';
import { applyCorrections } from './seed-corrections.mjs';

const engineData = new URL('../engine/data/seed/', import.meta.url);
const own = new URL('../engine/data/mixtura/', import.meta.url);
const read = (name, base = engineData) => JSON.parse(readFileSync(new URL(name, base), 'utf8'));

/** The seed object in the shape of `store/seed.ts`. */
export function assembleSeed() {
  const ingredients = read('ingredients.json');
  const specs = read('specs.json');
  const vocabulary = read('vocabulary.json');
  const mixturaIngredients = read('ingredients.json', own);
  const mixturaSpecs = read('specs.json', own);
  const { corrections } = read('corrections.json', own);
  const { attribution } = ingredients;
  return {
    seedVersion: `bar-assistant-${attribution.commit.slice(0, 7)}+mixtura-2`,
    attribution: {
      ...attribution,
      notice: `${attribution.notice} ${mixturaIngredients.attribution.notice}`,
    },
    vocabulary: { methods: vocabulary.methods, glasses: vocabulary.glasses },
    ingredients: [
      ...applyCorrections(ingredients.ingredients, corrections),
      ...mixturaIngredients.ingredients,
    ],
    templates: [...ROOT_TEMPLATES, ...VARIANT_TEMPLATES],
    specs: [...specs.specs, ...mixturaSpecs.specs],
    affinities: [],
  };
}
