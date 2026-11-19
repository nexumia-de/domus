// The name of an ingredient in a classic's line: the notebook's ingredient, else the shipped
// catalogue's (loaded once, on first need), in the content language; the id when neither knows it.
import type { Lang } from '@culina/engine';
import { loadCatalogue } from '../catalogue/load';
import { getIngredient } from '../notebook';
import type { IngredientRecord } from '../records';

let catalogue: ReadonlyMap<string, IngredientRecord> = new Map();

/** Loads the catalogue; resolves with its entries by id (empty when it cannot be read). */
export const loadNames = async (): Promise<ReadonlyMap<string, IngredientRecord>> => {
  const entries = await loadCatalogue();
  if (entries !== undefined) catalogue = new Map(entries.map((e) => [e.id, e]));
  return catalogue;
};

export const catalogueEntries = (): ReadonlyMap<string, IngredientRecord> => catalogue;

const nameIn = (record: IngredientRecord, lang: Lang): string =>
  lang === 'de' ? (record.names?.['de']?.name ?? record.name) : record.name;

/** The name of a catalogue ingredient id in a language. */
export const ingredientLabel = (id: string, lang: Lang): string => {
  const record = getIngredient(id) ?? catalogue.get(id);
  return record === undefined ? id : nameIn(record, lang);
};
