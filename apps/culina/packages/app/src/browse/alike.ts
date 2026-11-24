// "Dishes like this": the other dishes that share most of what this one is like, computed from
// the entries of the lists (./entry.ts), never written. Pure: no DOM; the entries come in.
//
// The measure is the project's judgement (docs/behaviour.md, Dishes like this): the characters
// two dishes share, over the characters either has (Jaccard), without "with meat" and "with fish"
// (`NOT_FOR_LIKE`). Only dishes of the same course are compared where both state one, so a dessert
// is never like a main. A match needs at least `LIKE_MIN_SHARED` shared characters, a share of at
// least `LIKE_MIN_SCORE`, and one shared character that is not only how the dish is seasoned
// (`SEASONING`); below that the answer is nothing, never a weak match. Ties: more characters
// shared, then the same "without meat and fish", then the same cuisine, then the order of the
// lists. The same dish under another key is never offered as like itself: a shipped dish and its
// copy kept in the notebook, two copies of it, and a frame and a recipe that is one of its parts.
import { entryKey } from './entry';
import type { DishEntry } from './entry';

/** Characters that say what is in a dish, not what it is like: never counted for "like". */
export const NOT_FOR_LIKE: readonly string[] = ['with-meat', 'with-fish'];

/**
 * Characters of how a dish is seasoned: a tomato base, garlic, lemon, chilli. They count in the
 * share, but two dishes alike only in these are not alike (dal and tacos are both tomatoey,
 * garlicky and lemony); a match needs one shared character outside this list.
 */
export const SEASONING: readonly string[] = ['tomatoey', 'garlicky', 'lemony', 'spicy'];

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
  parts?: readonly string[];
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
const shippedKey = (e: LikeEntry): string | undefined => {
  if (e.copyOf !== undefined) return entryKey('shipped', e.copyOf);
  return e.key.startsWith('shipped:') ? e.key : undefined;
};

/** Whether `frame` has the dish `part` is (or was kept from) among its parts. */
const hasPart = (frame: LikeEntry, part: LikeEntry): boolean => {
  const key = shippedKey(part);
  return key !== undefined && (frame.parts ?? []).some((p) => entryKey('shipped', p) === key);
};

/** The same dish under two keys: itself, a shipped dish and its copies, a frame and its parts. */
const sameDish = (a: LikeEntry, b: LikeEntry): boolean => {
  if (a.key === b.key) return true;
  const from = shippedKey(a);
  if (from !== undefined && from === shippedKey(b)) return true;
  return hasPart(a, b) || hasPart(b, a);
};

/**
 * The dish of a page as the measure reads it: the entry of the dish as shown (a swap, a chosen
 * filling), under the key the lists know it by, with the parts of a frame from the lists' entry
 * (which reads the file with the alternatives of its slots).
 *
 * @param shown - The entry of the dish as shown.
 * @param key - Its key in the lists (an own dish's family head).
 * @param listed - Its entry in the lists, where there is one.
 */
export const likeInput = (shown: LikeEntry, key: string, listed?: LikeEntry): LikeEntry => {
  const parts = listed?.parts ?? shown.parts;
  return { ...shown, key, ...(parts === undefined ? {} : { parts }) };
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
  if (shared.every((id) => SEASONING.includes(id))) return undefined;
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
