// The one function of the sync cycle with side effects: stores the merged
// state of an `ok` or `moved` outcome in one transaction and redraws the stock.
// Docs: docs/sync-cycle.md#applying-the-result.

import { mergePlace, mergeRecords } from '@mixtura/engine';
import type { AppState } from '../app-state';
import type { Store } from '../state';
import { invalidateStock } from '../stock/state';
import { isUserId, type Ingredient, type LocalStore, type StockRecord } from '../store';
import { validateEntity } from '../store/validate';
import type { SyncMoved, SyncOk } from './outcome';
import { recordsToRows, rowsToRecords } from './records';

const valid = (kind: 'stock' | 'ingredient' | 'place', value: unknown): boolean => {
  try {
    validateEntity(kind, value);
    return true;
  } catch {
    return false;
  }
};

/** The file's data is not trusted: a record that breaks its schema or names another place is skipped. */
const usable = (placeId: string, row: StockRecord): boolean =>
  row.placeId === placeId && valid('stock', row);

/**
 * Stores the merge. The rows read inside the transaction are merged with the
 * outcome again, so a change made while the cycle was in flight stays; only
 * records that differ are written. Ingredients are only added, never replaced
 * (they have no change time yet, issue #143).
 */
export async function applyOutcome(
  local: LocalStore,
  app: Store<AppState>,
  outcome: SyncOk | SyncMoved,
): Promise<void> {
  const placeId = outcome.place.id;
  await local.transactPlace(placeId, (current) => {
    const incoming = rowsToRecords(outcome.rows.filter((row) => usable(placeId, row)));
    const merged = mergeRecords(rowsToRecords(current.stock), incoming);
    const changed = new Set(merged.changedLocal);
    const stock = recordsToRows(placeId, merged.records).filter((row) =>
      changed.has(row.ingredientId),
    );
    const place = current.place ? mergePlace(current.place, outcome.place) : undefined;
    const ingredients: Ingredient[] = outcome.entities.filter(
      (i) => isUserId(i.id) && !current.ingredientIds.has(i.id) && valid('ingredient', i),
    );
    return {
      place: place?.changedLocal ? place.place : undefined,
      stock: stock.filter((row) => usable(placeId, row)),
      ingredients,
    };
  });
  invalidateStock(app);
}
