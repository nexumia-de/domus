// Where ratings are kept: the collection `ratings` of a space, one record per person and drink,
// key `<person id>/<lineage id>`, value `{ rating }`. Pure: no store, no clock
// (docs/ratings.md). Person ids are base64url, so the first `/` ends them.
import type { SyncRecord } from '@mixtura/engine';

export const RATINGS_COLLECTION = 'ratings';
export const RATINGS = ['favourite', 'good', 'not-for-me'] as const;
export type Rating = (typeof RATINGS)[number];

export const isRating = (value: unknown): value is Rating =>
  (RATINGS as readonly unknown[]).includes(value);

export const ratingKey = (personId: string, lineageId: string): string =>
  `${personId}/${lineageId}`;

/** Every person's rating of every drink: person id, then lineage id. Foreign values are skipped. */
export function ratingsOf(records: readonly SyncRecord[]): Map<string, Map<string, Rating>> {
  const byPerson = new Map<string, Map<string, Rating>>();
  for (const { key, deleted, value } of records) {
    const cut = key.indexOf('/');
    const rating = (value as { rating?: unknown } | null)?.rating;
    if (deleted || cut < 1 || cut === key.length - 1 || !isRating(rating)) continue;
    const person = key.slice(0, cut);
    const drinks = byPerson.get(person) ?? new Map<string, Rating>();
    drinks.set(key.slice(cut + 1), rating);
    byPerson.set(person, drinks);
  }
  return byPerson;
}

/** Liked: good or favourite. */
export const liked = (rating: Rating | undefined): boolean =>
  rating === 'good' || rating === 'favourite';

/**
 * Whether everyone of the space likes the drink: at least two persons, each rated it good or
 * favourite. A person who has not rated it does not count as liking it.
 */
export function likedByAll(
  lineageId: string,
  personIds: readonly string[],
  byPerson: ReadonlyMap<string, ReadonlyMap<string, Rating>>,
): boolean {
  return personIds.length >= 2 && personIds.every((p) => liked(byPerson.get(p)?.get(lineageId)));
}
