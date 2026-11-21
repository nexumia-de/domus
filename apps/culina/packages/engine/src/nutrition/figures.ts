// The figures an ingredient line is counted with: its density, unit weight and nutrients per 100 g,
// taken from the record the line points at, from the records above it, or, for a group whose
// members do not agree, from the member the catalogue names as the usual one. Pure: the records
// come in through a lookup; nothing is read from elsewhere. Rule in docs/engine-rules.md
// (Nutrition, "The figures of a line").
import type { IngredientFacts } from '../amounts/types';
import type { NutrientsPer100g } from './types';

/** What the figures of one catalogue or notebook record are, as the rule reads them. */
export interface FigureRecord {
  parentId?: string;
  densityGPerMl?: number;
  unitWeightG?: number;
  nutrition?: NutrientsPer100g;
  /** For a group: the member the catalogue names as the usual one (`x-group.usual.id`). */
  usualId?: string;
}

/** Finds a record by id; `undefined` when there is none. */
export type FigureLookup = (id: string) => FigureRecord | undefined;

/** Where a figure came from: the record itself, a record above it, or the group's usual member. */
export interface FigureOrigin {
  /** The id of the record that holds the value. */
  id: string;
  by: 'own' | 'parent' | 'usual';
}

export interface LineFigures {
  facts: IngredientFacts;
  nutrition?: NutrientsPer100g;
  /** For every figure found, where it came from. */
  from: {
    densityGPerMl?: FigureOrigin;
    unitWeightG?: FigureOrigin;
    nutrition?: FigureOrigin;
  };
}

/** The tree is at most this deep; a longer chain (or a cycle) is cut here. */
const MAX_DEPTH = 12;

type Field = 'densityGPerMl' | 'unitWeightG' | 'nutrition';

/** The record's own value, else the nearest own value above it; never a usual member's. */
const inherited = (
  id: string,
  field: Field,
  lookup: FigureLookup,
): { value: number | NutrientsPer100g; origin: FigureOrigin } | undefined => {
  const seen = new Set<string>();
  let at: string | undefined = id;
  for (let depth = 0; at !== undefined && depth < MAX_DEPTH && !seen.has(at); depth++) {
    seen.add(at);
    const record = lookup(at);
    if (record === undefined) return undefined;
    const value = record[field];
    if (value !== undefined) return { value, origin: { id: at, by: at === id ? 'own' : 'parent' } };
    at = record.parentId;
  }
  return undefined;
};

/**
 * The figures of the ingredient `id`, field by field (density, unit weight, nutrients):
 *
 * 1. the record's own value;
 * 2. else the nearest value of a record above it (a parent's value is true of every row below it,
 *    which is how the catalogue gives a parent one);
 * 3. else, when the record is a group that names a usual member (`usualId`, which must be below
 *    the group), that member's value by steps 1 and 2.
 *
 * A usual member's value is only ever used for the group itself, never handed down to the
 * group's other members: "Egg, whole, dried" does not get the piece weight of a fresh egg.
 *
 * @param id - The ingredient the line points at.
 * @param lookup - Finds a record by id.
 * @returns The facts for `toGrams`, the nutrients (absent when none is found) and their origins.
 */
export function lineFigures(id: string, lookup: FigureLookup): LineFigures {
  const usual = usualOf(id, lookup);
  const facts: { densityGPerMl?: number; unitWeightG?: number } = {};
  const from: LineFigures['from'] = {};
  let nutrition: NutrientsPer100g | undefined;
  for (const field of ['densityGPerMl', 'unitWeightG', 'nutrition'] as const) {
    let found = inherited(id, field, lookup);
    if (found === undefined && usual !== undefined) {
      const member = inherited(usual, field, lookup);
      if (member !== undefined)
        found = { value: member.value, origin: { id: member.origin.id, by: 'usual' } };
    }
    if (found === undefined) continue;
    from[field] = found.origin;
    if (field === 'nutrition') nutrition = found.value as NutrientsPer100g;
    else facts[field] = found.value as number;
  }
  return { facts, ...(nutrition === undefined ? {} : { nutrition }), from };
}

/** The usual member of a group, if it is named and really below the group. */
const usualOf = (id: string, lookup: FigureLookup): string | undefined => {
  const usual = lookup(id)?.usualId;
  if (usual === undefined || usual === id) return undefined;
  const seen = new Set<string>();
  let at = lookup(usual)?.parentId;
  for (let depth = 0; at !== undefined && depth < MAX_DEPTH && !seen.has(at); depth++) {
    if (at === id) return usual;
    seen.add(at);
    at = lookup(at)?.parentId;
  }
  return undefined;
};
