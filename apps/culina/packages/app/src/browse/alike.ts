// "Dishes like this": the other dishes that share most of what this one is like, computed from
// the entries of the lists (./entry.ts), never written. Pure: no DOM; the entries come in.
//
// The measure is the project's judgement (docs/behaviour.md, Dishes like this): the characters
// two dishes share, over the characters either has (Jaccard), with "with meat", "with fish" and
// "uncooked" left out (see `NOT_FOR_LIKE`). Only dishes of the same course are compared where both
// state one, so a dessert is never like a main. A match needs at least `LIKE_MIN_SHARED` shared
// characters and a share of at least `LIKE_MIN_SCORE`; below that the answer is nothing, never a
// weak match. Ties: more characters shared, then the same "without meat and fish", then the same
// cuisine, then the order of the lists. The same dish under another key (a shipped dish and its
// copy kept in the notebook, or two copies of it) is never offered as like itself.
import { entryKey } from './entry';
import type { DishEntry } from './entry';

/**
 * Characters never counted for "like". "With meat" and "with fish" say what is in a dish, not
 * what it is like. "Uncooked" is said from the absence of a heat technique, and on the shipped
 * dishes it is said of cooked dishes whose heat steps are plain actions ("cook", "heat"): pizza,
 * tacos, scrambled eggs; a likeness rests on what is there, not on what a rule did not find.
 */
export const NOT_FOR_LIKE: readonly string[] = ['with-meat', 'with-fish', 'uncooked'];

/** At least this many characters in common. */
export const LIKE_MIN_SHARED = 2;
/** At least this share of the characters either dish has in common. */
export const LIKE_MIN_SCORE = 0.5;
/** At most this many dishes are offered. */
export const LIKE_MAX = 5;

/** The fields of an entry the measure reads. */
export interface LikeEntry {
  key: string;
  characters: readonly string[];
  course?: string;
  cuisine?: string;
  meatFree?: boolean;
  copyOf?: string;
}

export interface Alike<E extends LikeEntry = DishEntry> {
  entry: E;
  /** The characters both have, in the order of this dish's characters. */
  shared: string[];
  /** The shared characters over those either has, from 0 to 1. */
  score: number;
}

const forLike = (ids: readonly string[]): string[] =>
  ids.filter((id) => !NOT_FOR_LIKE.includes(id));

/** The key of the shipped dish an entry is, or was kept from. */
const shippedKey = (e: LikeEntry): string | undefined =>
  e.copyOf === undefined
    ? e.key.startsWith('shipped:')
      ? e.key
      : undefined
    : entryKey('shipped', e.copyOf);

const sameDish = (a: LikeEntry, b: LikeEntry): boolean => {
  if (a.key === b.key) return true;
  const from = shippedKey(a);
  return from !== undefined && from === shippedKey(b);
};

/**
 * How alike two dishes are, or `undefined` when they are not alike enough to name.
 *
 * @param dish - The dish whose page is shown.
 * @param other - Another dish.
 */
export const likeness = <E extends LikeEntry>(dish: LikeEntry, other: E): Alike<E> | undefined => {
  if (sameDish(dish, other)) return undefined;
  if (dish.course !== undefined && other.course !== undefined && dish.course !== other.course) {
    return undefined;
  }
  const mine = forLike(dish.characters);
  const theirs = new Set(forLike(other.characters));
  const shared = mine.filter((id) => theirs.has(id));
  const either = new Set([...mine, ...theirs]).size;
  const score = either === 0 ? 0 : shared.length / either;
  if (shared.length < LIKE_MIN_SHARED || score < LIKE_MIN_SCORE) return undefined;
  return { entry: other, shared, score };
};

/**
 * Up to `max` dishes like this one, most alike first; none when nothing is alike enough.
 *
 * @param dish - The dish whose page is shown, as an entry of the lists.
 * @param entries - Every dish as the lists show them (own and shipped); the dish itself is skipped.
 * @param max - How many at most.
 */
export const dishesLike = <E extends LikeEntry>(
  dish: LikeEntry,
  entries: readonly E[],
  max: number = LIKE_MAX,
): Alike<E>[] => {
  const found = entries.flatMap((other, index) => {
    const alike = likeness(dish, other);
    return alike === undefined ? [] : [{ alike, index }];
  });
  const same = (a: unknown, b: unknown): number => (a !== undefined && a === b ? 1 : 0);
  found.sort(
    (a, b) =>
      b.alike.score - a.alike.score ||
      b.alike.shared.length - a.alike.shared.length ||
      same(dish.meatFree, b.alike.entry.meatFree) - same(dish.meatFree, a.alike.entry.meatFree) ||
      same(dish.cuisine, b.alike.entry.cuisine) - same(dish.cuisine, a.alike.entry.cuisine) ||
      a.index - b.index,
  );
  return found.slice(0, max).map((f) => f.alike);
};
