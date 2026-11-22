// One entry for every dish the app knows, whatever its origin: a dish of the notebook or a shipped
// classic. The lists, the finder and the random pick filter these entries by the same rules
// (./filter.ts). Pure: no DOM; the notebook, the classics and the ingredient lookup come in.
import {
  COUNTRY_CODES,
  COURSE_IDS,
  correctCharacters,
  deriveClassic,
  pickText,
} from '@culina/engine';
import type { Classic, Course, Lang } from '@culina/engine';
import { catalogueBelow } from '../characters/below';
import type { Below, Lookup } from '../characters/classes';
import { CHARACTER_ORDER } from '../characters/correction';
import { factsOfClassic } from '../characters/classic';
import { factsOfDish } from '../characters/dish';
import { meatFreeOf } from '../characters/meat-free';
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
  /** The cuisine as a country code (`de`, `it`, `fr`, `es`: a classic's country or a dish's `cuisine`); absent when none is stated. */
  cuisine?: string;
  /**
   * True: without meat and fish. For a shipped dish this is set by hand in its file; for a dish
   * of the notebook it is derived (`meatFreeOf`): false for a line of meat, fish or another food of
   * an animal's body; true only when every line is known. Undefined: not known, and the filter
   * does not keep it.
   */
  meatFree?: boolean;
  /** The ids of its characters, in the order of the table; for a dish of the notebook after the cook's correction. */
  characters: readonly string[];
  /** True when every line that names an ingredient has an amount; for a dish of the notebook, every slot. */
  complete: boolean;
}

export const entryKey = (origin: Origin, id: string): string => `${origin}:${id}`;

/**
 * The entry of a dish of the notebook. Without meat and fish is derived (`meatFreeOf`): said only
 * when every line is known, and never of a line of an animal's body.
 *
 * @param below - The foods below a catalogue group; by default those of the loaded catalogue.
 */
export const entryOfDish = (
  nb: Notebook,
  dish: DishRecord,
  lookup: Lookup,
  below: Below = catalogueBelow,
): DishEntry => {
  const facts = factsOfDish(nb, dish, lookup, below);
  // The cook's correction of this dish counts everywhere the characters are read: chips, filter.
  const characters = correctCharacters(characterIds(facts), dish.characters, CHARACTER_ORDER);
  const meatFree = meatFreeOf(facts, lookup, below);
  return {
    key: entryKey('own', dish.id),
    origin: 'own',
    id: dish.id,
    name: dish.name,
    href: `#/dishes/${encodeURIComponent(dish.id)}`,
    // Only a value of the lists: a record that carries something else states nothing.
    ...(COURSE_IDS.some((c) => c === dish.course) ? { course: dish.course } : {}),
    ...(COUNTRY_CODES.some((c) => c === dish.cuisine) ? { cuisine: dish.cuisine } : {}),
    ...(meatFree === undefined ? {} : { meatFree }),
    characters,
    complete: dish.slots.length > 0 && dish.slots.every((s) => s.amount !== undefined),
  };
};

const classicComplete = (classic: Classic): boolean => {
  const derived = deriveClassic(classic, { lang: 'en' });
  if (!derived.ok) return false;
  // A slot or line that names a component of the dish carries no amount of its own: the amounts
  // are on the component's lines. Only what names an ingredient is asked.
  const lines = [...derived.components.flatMap((c) => c.lines), ...derived.dish.slots].filter(
    (l) => l.ref?.kind !== 'component',
  );
  return lines.length > 0 && lines.every((l) => l.amount !== undefined);
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
