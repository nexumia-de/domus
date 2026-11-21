// One entry for every dish the app knows, whatever its origin: a dish of the notebook or a shipped
// classic. The lists, the finder and the random pick filter these entries by the same rules
// (./filter.ts). Pure: no DOM; the notebook, the classics and the ingredient lookup come in.
import { deriveClassic, pickText } from '@culina/engine';
import type { CharacterFacts, Classic, Course, Lang } from '@culina/engine';
import type { Lookup } from '../characters/classes';
import { factsOfClassic } from '../characters/classic';
import { factsOfDish } from '../characters/dish';
import { characterIds } from '../characters/view';
import type { DishRecord, Notebook } from '../records';

/** Where a dish comes from: the user's notebook, or the shipped collection. */
export type Origin = 'own' | 'shipped';

export interface DishEntry {
  /** Unique over both origins: `own:<id>` or `shipped:<id>`. */
  key: string;
  origin: Origin;
  id: string;
  /** The name in the content language. */
  name: string;
  /** The hash of the dish's screen. */
  href: string;
  /** Absent when the dish states none. */
  course?: Course;
  /** The cuisine as a country code (`de`, `it`, `fr`, `es`, or what the user gave); absent when none is stated. */
  cuisine?: string;
  /**
   * True: without meat and fish. For a shipped dish this is set by hand in its file; for a dish
   * of the notebook it is derived, and only said when the catalogue places every ingredient line in a
   * food category. Undefined: not known, and the filter does not keep it.
   */
  meatFree?: boolean;
  /** The ids of its characters, in the order of the table. */
  characters: readonly string[];
  /** True when every ingredient line and slot has an amount. */
  complete: boolean;
}

export const entryKey = (origin: Origin, id: string): string => `${origin}:${id}`;

/** A line is known when the catalogue places its ingredient in a food category. */
const isCategory = (c: string): boolean => c.startsWith('category:');

const MEAT_OR_FISH: readonly string[] = ['with-meat', 'with-fish'];

const derivedMeatFree = (
  facts: CharacterFacts,
  characters: readonly string[],
): boolean | undefined => {
  if (characters.some((c) => MEAT_OR_FISH.includes(c))) return false;
  if (facts.lines.length === 0 || facts.lines.some((l) => !l.classes.some(isCategory)))
    return undefined;
  return true;
};

/** The entry of a dish of the notebook. */
export const entryOfDish = (nb: Notebook, dish: DishRecord, lookup: Lookup): DishEntry => {
  const facts = factsOfDish(nb, dish, lookup);
  const characters = characterIds(facts);
  const meatFree = derivedMeatFree(facts, characters);
  return {
    key: entryKey('own', dish.id),
    origin: 'own',
    id: dish.id,
    name: dish.name,
    href: `#/dishes/${encodeURIComponent(dish.id)}`,
    ...(meatFree === undefined ? {} : { meatFree }),
    characters,
    complete: dish.slots.length > 0 && dish.slots.every((s) => s.amount !== undefined),
  };
};

const classicComplete = (classic: Classic): boolean => {
  const derived = deriveClassic(classic, { lang: 'en' });
  if (!derived.ok) return false;
  const lines = [...derived.components.flatMap((c) => c.lines), ...derived.dish.slots];
  return lines.every((l) => l.amount !== undefined);
};

/** The entry of a shipped classic. */
export const entryOfClassic = (classic: Classic, lookup: Lookup, lang: Lang): DishEntry => ({
  key: entryKey('shipped', classic.id),
  origin: 'shipped',
  id: classic.id,
  name: pickText(classic.name, lang),
  href: `#/classic/${encodeURIComponent(classic.id)}`,
  course: classic.course,
  cuisine: classic.country,
  meatFree: classic.vegetarian,
  characters: characterIds(factsOfClassic(classic, lookup)),
  complete: classicComplete(classic),
});

/** Every dish: the notebook's first (in its order), then the shipped ones (in theirs). */
export const allEntries = (
  nb: Notebook,
  dishes: readonly DishRecord[],
  classics: readonly Classic[],
  lookup: Lookup,
  lang: Lang,
): DishEntry[] => [
  ...dishes.map((d) => entryOfDish(nb, d, lookup)),
  ...classics.map((c) => entryOfClassic(c, lookup, lang)),
];
