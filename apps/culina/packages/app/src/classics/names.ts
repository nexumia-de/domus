// The name of an ingredient in a classic's line: the notebook's ingredient, else the shipped
// catalogue's (loaded once, on first need), in the content language; the id when neither knows it.
import type { Lang } from '@culina/engine';
import { loadCatalogue } from '../catalogue/load';
import { getIngredient } from '../notebook';
import { displayName } from '../shared/names';
import type { IngredientRecord } from '../records';

let catalogue: ReadonlyMap<string, IngredientRecord> = new Map();
/** The list the map was built from: the loader hands out the same list until it is reset. */
let builtFrom: readonly IngredientRecord[] | undefined;

/**
 * Loads the catalogue; resolves with its entries by id (empty when it cannot be read). Every
 * screen calls it; while the loaded list is the same, the map is the same object, so the caches
 * keyed by it (the dish entries, src/browse/entries.ts) are not made again on each screen.
 */
export const loadNames = async (): Promise<ReadonlyMap<string, IngredientRecord>> => {
  const entries = await loadCatalogue();
  if (entries !== undefined && entries !== builtFrom) {
    catalogue = new Map(entries.map((e) => [e.id, e]));
    builtFrom = entries;
  }
  return catalogue;
};

export const catalogueEntries = (): ReadonlyMap<string, IngredientRecord> => catalogue;

/** The name of a catalogue ingredient id in a language. */
export const ingredientLabel = (id: string, lang: Lang): string => {
  const record = getIngredient(id) ?? catalogue.get(id);
  return record === undefined ? id : displayName(record, lang);
};
