// What a rule can read of one ingredient: its classes (its id, the ids above it in the tree and
// the USDA food categories on the way, as `category:<name>`) and its figures per 100 g.
import type { CharacterLine } from '@culina/engine';
import type { IngredientRecord } from '../records';

/** An ingredient by id: the notebook's, else the shipped catalogue's. */
export type Lookup = (id: string) => IngredientRecord | undefined;

/** The tag of a USDA food category among the classes of a line. */
export const categoryClass = (category: string): string => `category:${category}`;

/** The foods directly below an ingredient group in the catalogue. */
export type Below = (id: string) => readonly IngredientRecord[];

const categoryOf = (record: IngredientRecord | undefined): string | undefined =>
  record?.['x-fdc']?.category ?? record?.['x-group']?.category;

/** Every value stated below an ingredient, the nearest on each branch; a loop ends the walk. */
const valuesBelow = <T>(
  id: string,
  below: Below,
  valueOf: (r: IngredientRecord) => T | undefined,
  seen: Set<string> = new Set(),
): T[] => {
  if (seen.has(id)) return [];
  seen.add(id);
  return below(id).flatMap((child) => {
    const own = valueOf(child);
    return own === undefined ? valuesBelow(child.id, below, valueOf, seen) : [own];
  });
};

/** The one value every food below an ingredient that states one agrees on; else `undefined`. */
const agreedBelow = <T>(
  id: string,
  below: Below,
  valueOf: (r: IngredientRecord) => T | undefined,
): T | undefined => {
  const values = new Set(valuesBelow(id, below, valueOf));
  return values.size === 1 ? [...values][0] : undefined;
};

/**
 * The ingredient's id, its ancestors' ids and the categories found on the way; a loop ends the
 * walk. Where no category is found and `below` is given, the category every food below the
 * ingredient agrees on (the butter and pea groups of the catalogue state none of their own).
 */
export const classesOf = (id: string, lookup: Lookup, below?: Below): string[] => {
  const out: string[] = [];
  let current: string | undefined = id;
  while (current !== undefined && !out.includes(current)) {
    out.push(current);
    const record = lookup(current);
    const category = categoryOf(record);
    if (category !== undefined && !out.includes(categoryClass(category))) {
      out.push(categoryClass(category));
    }
    current = record?.parentId;
  }
  if (below !== undefined && !out.some((c) => c.startsWith('category:'))) {
    const agreed = agreedBelow(id, below, categoryOf);
    if (agreed !== undefined) out.push(categoryClass(agreed));
  }
  return out;
};

/** The line of one ingredient; `g` is absent when its mass is not known. */
export const lineOf = (
  id: string,
  g: number | undefined,
  lookup: Lookup,
  below?: Below,
): CharacterLine => {
  const per100g = lookup(id)?.['x-nutrition']?.per100g;
  return {
    classes: classesOf(id, lookup, below),
    ...(g === undefined ? {} : { g }),
    ...(per100g === undefined ? {} : { fatPer100g: per100g.fatG, kcalPer100g: per100g.kcal }),
  };
};

/** Some food at or below the ingredient has one of the classes (by its own classes and above). */
export const anyBelowIs = (
  id: string,
  classes: readonly string[],
  lookup: Lookup,
  below: Below,
): boolean => {
  const seen = new Set<string>();
  const visit = (at: string): boolean => {
    if (seen.has(at)) return false;
    seen.add(at);
    return below(at).some(
      (child) => classesOf(child.id, lookup).some((c) => classes.includes(c)) || visit(child.id),
    );
  };
  return visit(id);
};

/** The children index of some catalogue entries, as a `Below`. */
export const belowOf = (entries: Iterable<IngredientRecord>): Below => {
  const children = new Map<string, IngredientRecord[]>();
  for (const entry of entries) {
    if (entry.parentId === undefined) continue;
    const list = children.get(entry.parentId) ?? [];
    list.push(entry);
    children.set(entry.parentId, list);
  }
  return (id) => children.get(id) ?? [];
};

type ConversionKey = 'densityGPerMl' | 'unitWeightG';

/** The figure of the ingredient itself or of the nearest ingredient above it that states one. */
const statedAbove = (id: string, key: ConversionKey, lookup: Lookup): number | undefined => {
  const seen = new Set<string>();
  for (let at = lookup(id); at !== undefined && !seen.has(at.id);) {
    seen.add(at.id);
    const value = at[key]?.value;
    if (value !== undefined) return value;
    at = at.parentId === undefined ? undefined : lookup(at.parentId);
  }
  return undefined;
};

/**
 * Density and unit weight of an ingredient for the share by mass: its own; else the nearest
 * ingredient above it that states one (a variety weighs as its kind, as the nutrition view
 * converts); else, for a group, the one value every food below it that states one agrees on (the
 * whole-egg group states no weight, and the one egg below it that does says 44 g). Foods that
 * disagree (apples of 161 to 212 g, milks of 0.29 to 1.07 g/ml) give none.
 */
export const conversionOf = (
  id: string,
  lookup: Lookup,
  below: Below,
): { densityGPerMl?: number; unitWeightG?: number } => {
  const out: { densityGPerMl?: number; unitWeightG?: number } = {};
  for (const key of ['densityGPerMl', 'unitWeightG'] as const) {
    const value = statedAbove(id, key, lookup) ?? agreedBelow(id, below, (r) => r[key]?.value);
    if (value !== undefined) out[key] = value;
  }
  return out;
};
