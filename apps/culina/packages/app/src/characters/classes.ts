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
