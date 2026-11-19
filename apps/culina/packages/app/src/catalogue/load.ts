// The ingredient catalogue shipped with the app: its own file, fetched from the app's own origin
// the first time a picker needs it (the service worker has it precached, so it works offline).
// Entries are ordinary ingredient records; a file or an entry that does not fit is left out.
import type { IngredientRecord } from '../records';
import { schemaIssues } from '../store/validate';
import { withRoles } from './roles';

const FORMAT = 'culina-ingredient-catalogue';

export type Fetcher = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

const byName = (a: IngredientRecord, b: IngredientRecord): number =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

/** The usable entries of a catalogue file, sorted by name; undefined if it is not a catalogue. */
export const readCatalogue = (file: unknown): IngredientRecord[] | undefined => {
  if (typeof file !== 'object' || file === null) return undefined;
  const { format, formatVersion, ingredients } = file as Record<string, unknown>;
  if (format !== FORMAT || formatVersion !== 1 || !Array.isArray(ingredients)) return undefined;
  return withRoles(
    (ingredients as unknown[])
      .filter((entry) => schemaIssues('ingredients', entry).length === 0)
      .map((entry) => entry as IngredientRecord),
  ).sort(byName);
};

let loaded: Promise<IngredientRecord[] | undefined> | undefined;

/**
 * The catalogue, loaded once; a load that did not work is tried again the next time. The result
 * is undefined when the file cannot be fetched or read.
 */
export const loadCatalogue = (
  fetcher: Fetcher = (url) => fetch(url),
): Promise<IngredientRecord[] | undefined> => {
  loaded ??= fetcher('catalogue.json')
    .then((response) => (response.ok ? response.json() : undefined))
    .then(readCatalogue)
    .catch(() => undefined)
    .then((entries) => {
      if (entries === undefined) loaded = undefined;
      return entries;
    });
  return loaded;
};

/** Forgets what was loaded (for tests). */
export const resetCatalogue = (): void => {
  loaded = undefined;
};
