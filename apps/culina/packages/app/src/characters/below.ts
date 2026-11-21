// The foods below a group in the shipped catalogue, for the conversion of the character rules
// (`conversionOf`). Built once per loaded catalogue; empty until it is loaded, as the lookup is.
import { catalogueEntries } from '../classics/names';
import type { IngredientRecord } from '../records';
import { belowOf } from './classes';
import type { Below } from './classes';

let built: { from: ReadonlyMap<string, IngredientRecord>; below: Below } | undefined;

export const catalogueBelow: Below = (id) => {
  const entries = catalogueEntries();
  if (built?.from !== entries) built = { from: entries, below: belowOf(entries.values()) };
  return built.below(id);
};
