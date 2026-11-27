// The favourites (docs/data-model.md, Favourite): one record per marked dish, own or shipped,
// written through the store and then shown in the cache. Like the day a dish was cooked it does not
// tell the whole screen (no `emit`, which would draw it anew and move the focus): the screen that
// writes redraws its own part, and a list on screen beside it hears of the dish through
// `onFavouriteChange`. The cache array is replaced, never changed, so the entries of the lists
// (browse/entries.ts) know by identity when to be derived again.
import {
  favouriteDishes,
  favouriteId,
  favouriteRecord,
  type FavouriteOrigin,
  type FavouriteRecord,
} from '@culina/engine';
import { fail, type Result } from '../store/types';
import { state } from './state';
import { versionRecord } from './versions';

/** The family of an own dish from any of its version ids; undefined for an id that is no dish. */
const familyOf = (dishId: string): string | undefined =>
  versionRecord('dishes', dishId)?.version.family;

/** The id a favourite of the dish has: the family of an own dish, the id of a shipped one. */
const markOf = (origin: FavouriteOrigin, id: string): string | undefined =>
  origin === 'own' ? familyOf(id) : id;

type Listener = (origin: FavouriteOrigin, dish: string) => void;
const listeners = new Set<Listener>();

/** Called whenever a dish's mark is set, taken back or brought back. Returns the way to stop. */
export const onFavouriteChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const told = (origin: FavouriteOrigin, dish: string): void => {
  for (const listener of listeners) listener(origin, dish);
};

export interface Marked {
  /** The families of the own dishes marked; only families with a live dish. */
  own: ReadonlySet<string>;
  /** The ids of the shipped dishes marked. */
  shipped: ReadonlySet<string>;
}

/** The dishes marked as favourites. */
export const markedDishes = (): Marked => {
  const marked = favouriteDishes(state.favourites);
  const live = new Set(state.dishes.map((d) => d.version.family));
  return {
    own: new Set([...marked.own].filter((family) => live.has(family))),
    shipped: marked.shipped,
  };
};

/** True when the dish is marked: an own dish by any of its version ids, a shipped dish by its id. */
export const isFavourite = (origin: FavouriteOrigin, id: string): boolean => {
  const dish = markOf(origin, id);
  return dish !== undefined && markedDishes()[origin].has(dish);
};

/**
 * Marks the dish as a favourite or takes the mark back. Marking a marked dish and taking back a mark
 * that is not there write nothing. An own dish that another tab deleted meanwhile (its first
 * version is no longer live in the store) gets no mark: `not-found`.
 */
export const setFavourite = async (
  origin: FavouriteOrigin,
  id: string,
  on: boolean,
): Promise<Result<{ favourite: boolean }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const dish = markOf(origin, id);
  if (dish === undefined) return fail({ code: 'not-found' });
  if (isFavourite(origin, id) === on) return { ok: true, favourite: on };
  if (on) {
    if (origin === 'own') {
      const live = await state.store.get('dishes', dish);
      if (!live.ok) return live;
    }
    const record = favouriteRecord(origin, dish);
    const written = await state.store.put('favourites', record);
    if (!written.ok) return written;
    state.favourites = [...state.favourites.filter((f) => f.id !== record.id), record];
  } else {
    const done = await removeFavouriteOf(origin, dish);
    if (!done.ok) return done;
  }
  told(origin, dish);
  return { ok: true, favourite: on };
};

/**
 * Removes the record of a dish, for taking the mark back and for the delete of an own dish; the
 * result carries it for Undo, or nothing when the dish had none.
 */
export const removeFavouriteOf = async (
  origin: FavouriteOrigin,
  dish: string,
): Promise<Result<{ removed: FavouriteRecord | undefined }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const id = favouriteId(origin, dish);
  const kept = state.favourites.find((f) => f.id === id);
  if (kept === undefined) return { ok: true, removed: undefined };
  const done = await state.store.remove('favourites', id);
  if (!done.ok && done.error.code !== 'not-found') return done;
  state.favourites = state.favourites.filter((f) => f.id !== id);
  return { ok: true, removed: kept };
};

/** Undo of `removeFavouriteOf`: writes the record again. */
export const restoreFavourite = async (record: FavouriteRecord): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const written = await state.store.put('favourites', record);
  if (!written.ok) return written;
  state.favourites = [...state.favourites.filter((f) => f.id !== record.id), record];
  told(record.origin, record.dish);
  return { ok: true };
};
