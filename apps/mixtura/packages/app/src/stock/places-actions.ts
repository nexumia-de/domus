// Changing places: tick, entry place, add, rename, remove with Undo. Each
// change shows at once (memory first, every screen redraws) and is written
// behind, in order, like a stock mark. A failed write reads the store again
// and says so. Rules: `places-rules.ts`. Docs: docs/screens-stock-settings.md#places-131.

import { toStoreError, newUserId, type Binding, type Place, type StockRecord } from '../store';
import { invalidateSync } from '../sync/view';
import { strings } from '../strings';
import { showToast } from '../toast';
import { nowInstant } from '../today';
import * as rules from './places-rules';
import { placeWritten } from './written';
import {
  enqueueWrite,
  invalidateStock,
  readyCache,
  refresh,
  setPlaceRecords,
  type Cache,
  type StockContext,
} from './state';

const words = strings.places;

/** The words for a refusal. */
export function refusalText(refusal: rules.Refusal): string {
  switch (refusal.reason) {
    case 'last-counting':
      return words.lastCounting;
    case 'entry-counting':
      return words.entryCounting(refusal.name);
    case 'last-place':
      return words.lastPlace;
    case 'empty-name':
      return words.emptyName;
    case 'name-taken':
      return words.nameTaken(refusal.name);
  }
}

type Local = Cache['local'];

/** Puts the selection in memory and writes `work` behind; a failure reads the store again. */
function commit(
  context: StockContext,
  cache: Cache,
  next: rules.Selection,
  work: (local: Local) => Promise<void>,
): void {
  cache.selection = next;
  refresh(cache, context.store);
  enqueueWrite(async () => {
    try {
      await work(cache.local);
    } catch (error) {
      showToast(context.store, `${strings.data.notSaved}. ${toStoreError(error).message}`);
      invalidateStock(context.store);
    }
  });
}

const saveSelection = (local: Local, { ticked, entry }: rules.Selection): Promise<void> =>
  local.settings.set('places', { ticked, entry });

/** Ticks or unticks a place. Returns the refusal, if any; the sheet shows it. */
export function tickPlace(context: StockContext, id: string): rules.Refusal | null {
  const cache = readyCache(context);
  if (!cache) return null;
  const result = rules.toggleTicked(cache.selection, id);
  if (!result.ok) return result;
  commit(context, cache, result.selection, (local) => saveSelection(local, result.selection));
  return null;
}

/** New entries go to this place, which counts from now on. */
export function chooseEntry(context: StockContext, id: string): void {
  const cache = readyCache(context);
  if (!cache || cache.selection.entry === id) return;
  const next = rules.setEntry(cache.selection, id);
  commit(context, cache, next, (local) => saveSelection(local, next));
}

/** Adds a place that counts. Returns the refusal, if any. */
export function addPlace(context: StockContext, raw: string): rules.Refusal | null {
  const cache = readyCache(context);
  if (!cache) return null;
  const checked = rules.checkName(cache.selection, raw);
  if (!checked.ok) return checked;
  const place: Place = { id: newUserId(), name: checked.name, updatedAt: nowInstant() };
  const next = rules.addPlace(cache.selection, place);
  commit(context, cache, next, async (local) => {
    await local.places.put(place);
    await saveSelection(local, next);
  });
  return null;
}

/** Gives a place a new name and stamps it. Returns the refusal, if any. */
export function renamePlace(context: StockContext, id: string, raw: string): rules.Refusal | null {
  const cache = readyCache(context);
  const old = cache?.selection.places.find((p) => p.id === id);
  if (!cache || !old) return null;
  const checked = rules.checkName(cache.selection, raw, id);
  if (!checked.ok) return checked;
  if (checked.name === old.name) return null;
  const at = nowInstant();
  const next = rules.renamePlace(cache.selection, id, checked.name, at);
  commit(context, cache, next, async (local) => {
    await local.places.put({ id, name: checked.name, updatedAt: at });
    placeWritten(id);
  });
  return null;
}

/** Puts a removed place, its records and the earlier selection back exactly as they were. */
function restore(
  context: StockContext,
  place: Place,
  records: Map<string, StockRecord>,
  before: rules.Selection,
  binding: () => Binding | undefined,
): void {
  const cache = readyCache(context);
  if (!cache) return;
  setPlaceRecords(cache, place.id, new Map(records));
  commit(context, cache, before, async (local) => {
    await local.places.put(place);
    for (const record of records.values()) await local.stock.put(record);
    await saveSelection(local, before);
    const bound = binding();
    if (bound) await local.bindings.put(bound);
    invalidateSync(context.store);
  });
}

/**
 * Removes a place and its stock records (plain deletes; a place is local in this version) and
 * offers Undo, which restores the place, every record and the selection. The last place is refused.
 */
export function removePlace(context: StockContext, id: string): rules.Refusal | null {
  const cache = readyCache(context);
  const place = cache?.selection.places.find((p) => p.id === id);
  if (!cache || !place) return null;
  const result = rules.removePlace(cache.selection, id);
  if (!result.ok) return result;
  const before = cache.selection;
  const records = new Map(cache.byPlace.get(id) ?? []);
  setPlaceRecords(cache, id, null);
  // A synced place stops syncing with its removal; Undo binds it again. The file stays in the storage.
  let binding: Binding | undefined;
  commit(context, cache, result.selection, async (local) => {
    binding = await local.bindings.get(['place', id]);
    if (binding) await local.bindings.delete(['place', id]);
    for (const ingredientId of records.keys()) await local.stock.delete([id, ingredientId]);
    await local.places.delete(id);
    await saveSelection(local, result.selection);
    invalidateSync(context.store);
  });
  showToast(
    context.store,
    words.removed(place.name, [...records.values()].filter((r) => !('deleted' in r)).length),
    () => restore(context, place, records, before, () => binding),
  );
  return null;
}
