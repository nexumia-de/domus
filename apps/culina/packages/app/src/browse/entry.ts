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
import { classicOf } from '../classics/content';
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
   * True for a frame (tacos, ramen, pizza): the app's own composition of its recipes
   * (docs/classic-format.md, A frame), shipped or kept in the notebook. A kept copy stores no mark:
   * its entry reads it from the shipped dish it was kept from (`x-origin`). Absent otherwise.
   */
  frame?: true;
  /**
   * For a dish of the notebook kept from a shipped dish: the id of that dish (the record's
   * `x-origin`), so that "Dishes like this" does not offer a dish as like its own copy.
   */
  copyOf?: string;
  /**
   * For a frame, shipped or kept: the ids of the shipped recipes its components are
   * (`from.recipe`, of the file as shipped), the chosen ones and the alternatives, so that "Dishes
   * like this" does not offer a frame as like one of its own parts. Absent on every other dish.
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

/** The shipped recipes the components of a frame are, each once, in file order. */
const partsOf = (classic: Classic): string[] => [
  ...new Set(
    (classic.components ?? []).flatMap((c) => (c.from === undefined ? [] : [c.from.recipe])),
  ),
];

export const entryKey = (origin: Origin, id: string): string => `${origin}:${id}`;

/**
 * The dish with the origin its family was kept with, where its own record lost it: the dish
 * editor dropped `x-origin` from the version it saved until 2026-11-24 (src/editor/dish-form.ts),
 * while the version that was kept, and every version before the edit, still carry it. Read, not
 * written: nothing stored is changed. A dish that has its own origin, or whose family never had
 * one, is returned as it is.
 *
 * @param versions - Every stored version of every dish.
 */
export const withKeptOrigin = (dish: DishRecord, versions: readonly DishRecord[]): DishRecord => {
  if (keptFrom(dish) !== undefined) return dish;
  const kept = versions.find(
    (v) => v.version.family === dish.version.family && keptFrom(v) !== undefined,
  );
  if (kept === undefined) return dish;
  const origin = (kept as unknown as Record<string, unknown>)['x-origin'];
  return { ...dish, 'x-origin': origin } as DishRecord;
};

/**
 * The entry of a dish of the notebook. Without meat and fish is derived (`meatFreeOf`): said only
 * when every line is known, and never of a line of an animal's body.
 *
 * A dish kept from a shipped frame is a frame too, with that frame's parts: read from the shipped
 * dish its `x-origin` names, since the copy stores no mark of its own (copies kept before
 * 2026-11-24 come right without a migration). When that dish is not there (the content not loaded
 * yet, or a frame no longer shipped) the copy is an own dish like any other.
 *
 * @param below - The foods below a catalogue group; by default those of the loaded catalogue.
 * @param shippedOf - A shipped dish by id, as shipped (with its alternatives); by default from the
 *   loaded content.
 */
export const entryOfDish = (
  nb: Notebook,
  dish: DishRecord,
  lookup: Lookup,
  below: Below = catalogueBelow,
  shippedOf: (id: string) => Classic | undefined = classicOf,
): DishEntry => {
  const facts = factsOfDish(nb, dish, lookup, below);
  // The cook's correction of this dish counts everywhere the characters are read: chips, filter.
  const characters = correctCharacters(characterIds(facts), dish.characters, CHARACTER_ORDER);
  const meatFree = meatFreeOf(facts, lookup, below);
  const copyOf = keptFrom(dish);
  const from = copyOf === undefined ? undefined : shippedOf(copyOf);
  const parts = from?.frame === true ? partsOf(from) : [];
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
    ...(from?.frame === true ? { frame: true as const } : {}),
    ...(parts.length === 0 ? {} : { parts }),
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
