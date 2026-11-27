// The ratings the screens draw from: read from the space Mixtura rates in, kept in memory, read
// again after a sync or a write (docs/ratings.md). The space is picked like an app that shows one
// space: the first shared one, else the one on this device. In a shared space the person is who
// the Household app says this device is; in a space on this device only, a person "Me" is made
// with the first rating.
import {
  devicePerson,
  ensureDevicePerson,
  ensureSpace,
  localChange,
  pickSpace,
  readPersons,
  viewOf,
  type Store as SharedStore,
} from '@nexumia-de/hospes';
import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { type Store } from '../state';
import { strings } from '../strings';
import { nowInstant } from '../today';
import type { RatedOf } from '../screens/browse/filters';
import { RATINGS_COLLECTION, likedByAll, ratingKey, ratingsOf, type Rating } from './source';

export type RatingsState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      spaceId: string;
      deviceOnly: boolean;
      /** Who this device is; undefined in a shared space until it is chosen in the Household app. */
      personId: string | undefined;
      personIds: readonly string[];
      byPerson: ReadonlyMap<string, ReadonlyMap<string, Rating>>;
    };

export interface RatingsContext {
  state: AppState;
  store: Store<AppState>;
  data: AppData;
}

let epoch = 0;
let cache: { epoch: number; state: RatingsState } | undefined;

const bump = (app: Store<AppState>): void => app.set({ stockRev: app.get().stockRev + 1 });

/** Reads again on the next draw: a sync brought records, or a person was chosen. */
export function invalidateRatings(app: Store<AppState>): void {
  epoch += 1;
  bump(app);
}

async function spaceFor(shared: SharedStore): Promise<{ id: string; deviceOnly: boolean }> {
  const spaces = await ensureSpace(shared, strings.spaces.home);
  const views = spaces.map((s) => viewOf(s, strings.spaces.unnamed));
  const counts = new Map<string, number>();
  for (const s of spaces) {
    const { records } = await shared.readCollection(s.id, RATINGS_COLLECTION);
    counts.set(s.id, records.filter((r) => !r.deleted).length);
  }
  const view = pickSpace(views, null, counts) ?? views[0];
  if (!view) throw new Error('no space');
  return { id: view.id, deviceOnly: view.deviceOnly };
}

async function load(shared: SharedStore): Promise<RatingsState> {
  const space = await spaceFor(shared);
  const [records, me, persons] = await Promise.all([
    shared.readCollection(space.id, RATINGS_COLLECTION),
    devicePerson(shared, space.id),
    readPersons(shared, space.id),
  ]);
  return {
    kind: 'ready',
    spaceId: space.id,
    deviceOnly: space.deviceOnly,
    personId: me?.id,
    personIds: persons.map((p) => p.id),
    byPerson: ratingsOf(records.records),
  };
}

export function ratingsState({ state, store, data }: RatingsContext): RatingsState {
  if (state.storage.kind === 'opening') return { kind: 'loading' };
  if (cache?.epoch === epoch) return cache.state;
  const entry = { epoch, state: { kind: 'loading' } as RatingsState };
  cache = entry;
  load(data.shared).then(
    (loaded) => {
      entry.state = loaded;
      if (cache === entry) bump(store);
    },
    () => undefined,
  );
  return entry.state;
}

/** This device's rating of a drink. */
export function myRating(state: RatingsState, lineageId: string): Rating | undefined {
  if (state.kind !== 'ready' || state.personId === undefined) return undefined;
  return state.byPerson.get(state.personId)?.get(lineageId);
}

/** What the filters ask of a drink's ratings; undefined while they load. */
export function ratedOf(state: RatingsState): RatedOf | undefined {
  if (state.kind !== 'ready') return undefined;
  return (lineageId) => ({
    mine: myRating(state, lineageId),
    together: likedByAll(lineageId, state.personIds, state.byPerson),
  });
}

/**
 * Sets or clears (undefined) this device's rating. In a space on this device only the first
 * rating makes the person "Me"; in a shared space without a chosen person nothing is written.
 * @returns Whether it was written.
 */
export async function rate(
  { store, data }: RatingsContext,
  lineageId: string,
  rating: Rating | undefined,
  now: () => string = nowInstant,
): Promise<boolean> {
  const shared = data.shared;
  const space = await spaceFor(shared);
  const person = space.deviceOnly
    ? await ensureDevicePerson(space.id, strings.ratings.me, { store: shared, now })
    : await devicePerson(shared, space.id);
  if (!person) return false;
  const key = ratingKey(person.id, lineageId);
  await localChange(shared, space.id, RATINGS_COLLECTION, now, () =>
    rating === undefined ? { remove: [key] } : { put: [{ key, value: { rating } }] },
  );
  invalidateRatings(store);
  data.sync.changed(space.id);
  return true;
}
