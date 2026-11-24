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
  /**
   * True for a shipped frame (tacos, ramen, pizza): the app's own composition of its recipes
   * (docs/classic-format.md, A frame). Absent otherwise; a frame kept in the notebook is a dish of
   * its own and has none.
   */
  frame?: true;
  /**
   * For a dish of the notebook kept from a shipped dish: the id of that dish (the record's
   * `x-origin`), so that "Dishes like this" does not offer a dish as like its own copy.
   */
  copyOf?: string;
  /**
   * For a shipped frame: the ids of the shipped recipes its components are (`from.recipe`), the
   * chosen ones and the alternatives, so that "Dishes like this" does not offer a frame as like
   * one of its own parts. Absent on every other dish.
   */
  parts?: readonly string[];
}

/** The shipped dish a record was kept from (`x-origin.classic`), read defensively. */
const keptFrom = (dish: DishRecord): string | undefined => {
  const origin = (dish as unknown as Record<string, unknown>)['x-origin'];
  if (typeof origin !== 'object' || origin === null) return undefined;
  const classic = (origin as Record<string, unknown>)['classic'];
  return typeof classic === 'string' && classic !== '' ? classic : undefined;
};

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
  const copyOf = keptFrom(dish);
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
    ...(copyOf === undefined ? {} : { copyOf }),
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

/** The shipped recipes the components of a frame are, each once, in file order. */
const partsOf = (classic: Classic): string[] => [
  ...new Set(
    (classic.components ?? []).flatMap((c) => (c.from === undefined ? [] : [c.from.recipe])),
  ),
];

/**
 * The entry of a shipped classic.
 *
 * @param source - The file as shipped, with the alternatives of its slots, for the parts of a
 *   frame; by default the classic itself.
 */
export const entryOfClassic = (
  classic: Classic,
  lookup: Lookup,
  lang: Lang,
  source: Classic = classic,
): DishEntry => {
  const parts = partsOf(source);
  return {
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
    ...(classic.frame === true ? { frame: true as const } : {}),
    ...(parts.length === 0 ? {} : { parts }),
  };
};

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
