// Assembles the seed file the app loads (seed/seed.json) from the engine
// package: the seed ingredients and specs, the vocabulary, and the six root
// templates. Used by build.mjs and by the tests; the result is read-only
// data (docs/seed-data.md, docs/store.md).
import { readFileSync } from 'node:fs';
import { ROOT_TEMPLATES } from '@mixtura/engine';

const engineData = new URL('../engine/data/seed/', import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, engineData), 'utf8'));

/** The seed object in the shape of `store/seed.ts`. */
export function assembleSeed() {
  const ingredients = read('ingredients.json');
  const specs = read('specs.json');
  const vocabulary = read('vocabulary.json');
  const { attribution } = ingredients;
  return {
    seedVersion: `bar-assistant-${attribution.commit.slice(0, 7)}`,
    attribution,
    vocabulary: { methods: vocabulary.methods, glasses: vocabulary.glasses },
    ingredients: ingredients.ingredients,
    templates: ROOT_TEMPLATES,
    specs: specs.specs,
    affinities: [],
  };
}
