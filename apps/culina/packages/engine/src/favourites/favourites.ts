// The favourites: the dishes the user marked, one stored personal record per dish, own or shipped
// (docs/data-model.md, Favourite). A mark and no more: no date, no count and no order of marking
// (AGENTS.md, no food diary). The engine has no clock and no store; the host writes the records.

/** Whether a favourite points at a dish of the user's notebook or at a shipped dish. */
export type FavouriteOrigin = 'own' | 'shipped';

/** The stored record: `id` is `favourite-`, the origin and the id of the dish. */
export interface FavouriteRecord {
  id: string;
  origin: FavouriteOrigin;
  /** The id of the dish: a shipped dish's id, or the family id of an own dish (its first version). */
  dish: string;
}

/**
 * The record id of a dish's favourite mark.
 *
 * @param origin - `own` for a dish of the notebook, `shipped` for a dish the app ships.
 * @param dish - The id of a shipped dish, or the family id of an own dish.
 * @returns `favourite-<origin>-<dish>`: one record per dish, so marking it twice writes the same
 *   row, and two devices that mark the same dish merge by `updatedAt`. The origin is in the id
 *   because the ids of the two origins are not disjoint: the example dishes of the notebook have
 *   slugs, as the shipped dishes do.
 */
export const favouriteId = (origin: FavouriteOrigin, dish: string): string =>
  `favourite-${origin}-${dish}`;

/**
 * The record to write when a dish is marked.
 *
 * @param origin - `own` or `shipped`.
 * @param dish - The id of a shipped dish, or the family id of an own dish.
 * @returns The record, valid against `favourite.schema.json`.
 */
export const favouriteRecord = (origin: FavouriteOrigin, dish: string): FavouriteRecord => ({
  id: favouriteId(origin, dish),
  origin,
  dish,
});

/**
 * The dishes that are favourites, per origin. A record whose id is not the id of its origin and
 * dish is ignored, so a stray record cannot mark a dish.
 *
 * @param records - The live records.
 * @returns The family ids of the marked own dishes and the ids of the marked shipped dishes.
 */
export const favouriteDishes = (
  records: readonly FavouriteRecord[],
): Record<FavouriteOrigin, Set<string>> => {
  const marked: Record<FavouriteOrigin, Set<string>> = { own: new Set(), shipped: new Set() };
  for (const r of records) {
    if (r.id === favouriteId(r.origin, r.dish)) marked[r.origin].add(r.dish);
  }
  return marked;
};
