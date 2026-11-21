// What a rule can read of one ingredient: its classes (its id, the ids above it in the tree and
// the USDA food categories on the way, as `category:<name>`) and its figures per 100 g.
import type { CharacterLine } from '@culina/engine';
import type { IngredientRecord } from '../records';

/** An ingredient by id: the notebook's, else the shipped catalogue's. */
export type Lookup = (id: string) => IngredientRecord | undefined;

/** The tag of a USDA food category among the classes of a line. */
export const categoryClass = (category: string): string => `category:${category}`;

/** The ingredient's id, its ancestors' ids and the categories found on the way; a loop ends the walk. */
export const classesOf = (id: string, lookup: Lookup): string[] => {
  const out: string[] = [];
  let current: string | undefined = id;
  while (current !== undefined && !out.includes(current)) {
    out.push(current);
    const record = lookup(current);
    const category = record?.['x-fdc']?.category ?? record?.['x-group']?.category;
    if (category !== undefined && !out.includes(categoryClass(category))) {
      out.push(categoryClass(category));
    }
    current = record?.parentId;
  }
  return out;
};

/** The line of one ingredient; `g` is absent when its mass is not known. */
export const lineOf = (id: string, g: number | undefined, lookup: Lookup): CharacterLine => {
  const per100g = lookup(id)?.['x-nutrition']?.per100g;
  return {
    classes: classesOf(id, lookup),
    ...(g === undefined ? {} : { g }),
    ...(per100g === undefined ? {} : { fatPer100g: per100g.fatG, kcalPer100g: per100g.kcal }),
  };
};

/** The foods directly below an ingredient group in the catalogue. */
export type Below = (id: string) => readonly IngredientRecord[];

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

/** Every value of a figure stated below an ingredient, the nearest on each branch; a loop ends the walk. */
const statedBelow = (id: string, key: ConversionKey, below: Below, seen: Set<string>): number[] => {
  if (seen.has(id)) return [];
  seen.add(id);
  return below(id).flatMap((child) => {
    const own = child[key]?.value;
    return own === undefined ? statedBelow(child.id, key, below, seen) : [own];
  });
};

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
    let value = statedAbove(id, key, lookup);
    if (value === undefined) {
      const values = new Set(statedBelow(id, key, below, new Set()));
      if (values.size === 1) value = [...values][0];
    }
    if (value !== undefined) out[key] = value;
  }
  return out;
};
