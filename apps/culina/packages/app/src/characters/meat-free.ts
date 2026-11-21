// Whether a dish of the notebook is without meat and fish, from its ingredient lines. Apart from
// the characters: lard in a tomato sauce does not make it "with meat", but it is not meat-free.
// When in doubt the answer is "not known", never "meat-free": the filter then leaves the dish out.
import type { CharacterFacts } from '@culina/engine';
import { anyBelowIs, classesOf } from './classes';
import type { Below, Lookup } from './classes';
import { MEAT_AND_FISH } from './table';

const isCategory = (c: string): boolean => c.startsWith('category:');

/**
 * `false` when a line is meat, fish or another food of an animal's body (the table's
 * `meatAndFish`); else `true` only when every line is known: the catalogue places it in a food
 * category and it does not name a group of which some food below is such a food. A line without
 * any class (an ingredient nobody knows, a component that is gone or empty) is not known.
 *
 * @returns `undefined` when it cannot be told, and for a dish without lines.
 */
export const meatFreeOf = (
  facts: CharacterFacts,
  lookup: Lookup,
  below: Below,
  animal: readonly string[] = MEAT_AND_FISH.classes,
): boolean | undefined => {
  if (facts.lines.length === 0) return undefined;
  if (facts.lines.some((l) => l.classes.some((c) => animal.includes(c)))) return false;
  const known = facts.lines.every((l) => {
    const id = l.classes[0];
    if (id === undefined) return false;
    if (!l.classes.some(isCategory) && !placedBelow(id, lookup, below, new Set())) return false;
    return !anyBelowIs(id, animal, lookup, below);
  });
  return known ? true : undefined;
};

/**
 * A group without a category of its own is placed when it has foods and every one of them is in
 * some food category (the butter group: butters under Dairy, light butter under Fats and Oils).
 */
const placedBelow = (id: string, lookup: Lookup, below: Below, seen: Set<string>): boolean => {
  if (seen.has(id)) return false;
  seen.add(id);
  const foods = below(id);
  return (
    foods.length > 0 &&
    foods.every(
      (f) => classesOf(f.id, lookup).some(isCategory) || placedBelow(f.id, lookup, below, seen),
    )
  );
};
