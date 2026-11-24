// The date a dish was cooked (docs/data-model.md, Date a dish was cooked): one record per family of
// an own dish, written through the store and then shown in the cache. It does not tell the whole
// screen (no `emit`, which would draw it anew and move the focus): the screen that writes redraws
// its own part, and a list on screen beside it hears of the family through `onCookedChange`. The
// day is the device's calendar day at the app clock's instant (`localToday`), injected in tests.
import { cookedDates, cookedId, cookedRecord, type CookedRecord } from '@culina/engine';
import { fail, type Result } from '../store/types';
import { localToday, state } from './state';
import { versionRecord } from './versions';

/** The family of an own dish from any of its version ids; undefined for an id that is no dish. */
const familyOf = (dishId: string): string | undefined =>
  versionRecord('dishes', dishId)?.version.family;

type Listener = (family: string) => void;
const listeners = new Set<Listener>();

/**
 * Called with the family whenever its day is kept, cleared or brought back. Returns the way to
 * stop listening.
 */
export const onCookedChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const told = (family: string): void => {
  for (const listener of listeners) listener(family);
};

/** The day each dish family was last cooked, `YYYY-MM-DD`; only families with a live dish. */
export const cookedByFamily = (): Map<string, string> => {
  const live = new Set(state.dishes.map((d) => d.version.family));
  return new Map([...cookedDates(state.cooked)].filter(([family]) => live.has(family)));
};

/** The day the dish (any of its versions) was last cooked; undefined when none is kept. */
export const cookedOn = (dishId: string): string | undefined => {
  const family = familyOf(dishId);
  return family === undefined ? undefined : cookedByFamily().get(family);
};

/**
 * Keeps today as the day the dish was cooked: the end of cooking step by step and "Cooked today".
 * Any version id stands for its family. A day kept before is replaced, not added to; when today is
 * already kept nothing is written. A dish that another tab deleted meanwhile (its first version is
 * no longer live in the store) gets no day: `not-found`.
 */
export const markCooked = async (dishId: string): Promise<Result<{ date: string }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const family = familyOf(dishId);
  if (family === undefined) return fail({ code: 'not-found' });
  const date = localToday();
  if (cookedByFamily().get(family) === date) return { ok: true, date };
  const live = await state.store.get('dishes', family);
  if (!live.ok) return live;
  const record = cookedRecord(family, date);
  const written = await state.store.put('cooked', record);
  if (!written.ok) return written;
  state.cooked = [...state.cooked.filter((c) => c.id !== record.id), record];
  told(family);
  return { ok: true, date };
};

/** Forgets the day: the record is removed (a tombstone). Nothing kept is no error. */
export const clearCooked = async (dishId: string): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const family = familyOf(dishId);
  if (family === undefined) return fail({ code: 'not-found' });
  const done = await removeCookedOf(family);
  if (!done.ok) return done;
  told(family);
  return { ok: true };
};

/**
 * Removes the record of a family, for a delete of the dish; the result carries it for Undo, or
 * nothing when the family had none.
 */
export const removeCookedOf = async (
  family: string,
): Promise<Result<{ removed: CookedRecord | undefined }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const id = cookedId(family);
  const kept = state.cooked.find((c) => c.id === id);
  if (kept === undefined) return { ok: true, removed: undefined };
  const done = await state.store.remove('cooked', id);
  if (!done.ok && done.error.code !== 'not-found') return done;
  state.cooked = state.cooked.filter((c) => c.id !== id);
  return { ok: true, removed: kept };
};

/** Undo of `removeCookedOf`: writes the record again. */
export const restoreCooked = async (record: CookedRecord): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const written = await state.store.put('cooked', record);
  if (!written.ok) return written;
  state.cooked = [...state.cooked.filter((c) => c.id !== record.id), record];
  told(record.dish);
  return { ok: true };
};
