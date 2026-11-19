// One entry of the finder for a classic as text: the same status, reason, lacking lines, stand-ins
// and unknown amounts as an own dish (`cookRow`), a link to the dish view, and the lines the
// catalogue does not have yet, named neutrally and apart. Pure: names come in.
import type { ClassicCandidate, Lang } from '@culina/engine';
import { hashFor } from '../router';
import type { IngredientRecord } from '../records';
import { cookRow } from './rows';
import type { CookRow } from './rows';
import type { Lookup } from './lookup';

export interface ClassicRow extends CookRow {
  country: ClassicCandidate['country'];
  vegetarian: boolean;
  /** Lines the catalogue lacks, in the content language; not counted as lacking. */
  notInCatalogue: string[];
}

const nameIn = (record: IngredientRecord, lang: Lang): string =>
  lang === 'de' ? (record.names?.['de']?.name ?? record.name) : record.name;

/** Names in the content language: the ingredient's name, the id when it is not known. */
export const classicLookup = (
  ingredients: ReadonlyMap<string, IngredientRecord>,
  base: Lookup,
  lang: Lang,
): Lookup => ({
  name: (ref) =>
    ref.kind === 'ingredient'
      ? (() => {
          const record = ingredients.get(ref.id);
          return record === undefined ? ref.id : nameIn(record, lang);
        })()
      : base.name(ref),
  itemRef: base.itemRef,
});

export const classicRow = (candidate: ClassicCandidate, look: Lookup): ClassicRow => {
  const row = cookRow({ ...candidate, kind: 'dish' }, look, () => []);
  return {
    ...row,
    key: `classic:${candidate.id}`,
    kind: 'dish',
    href: hashFor('classic', candidate.id),
    country: candidate.country,
    vegetarian: candidate.vegetarian,
    notInCatalogue: candidate.notInCatalogue,
  };
};
