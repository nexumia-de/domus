// The move of the stock items Culina kept in its own database before 2026-11-20 into the shared
// collection `stock` of the used space, once (docs/decisions/stock-in-spaces.md, point 9). A record
// that already has a boolean `present` is never overwritten; the items move only after the shared
// write succeeded, and are removed from Culina's database only then. A failure leaves them where
// they are, and the next start tries again; a second run finds nothing to move.
import type { ComponentRef, StockItem } from '@culina/engine';
import { localChange, type Store as SharedStore } from '@nexumia-de/hospes';
import type { Store as OwnStore } from '../store';
import { liveValue, type SyncRecord } from './edits';
import { detailOf, isStockValue, STOCK, valueWith, type Detail, type Value } from './value';

/** What one run did; `failed` leaves Culina's own items in place. */
export type MoveResult =
  { ok: true; moved: string[]; kept: string[] } | { ok: false; reason: 'read' | 'write' | 'clear' };

const extrasOf = (item: Value): Value =>
  Object.fromEntries(Object.entries(item).filter(([field]) => field.startsWith('x-')));

/** The detail of an old item, under the in-memory names it already had. */
const oldDetail = (item: StockItem): Detail => {
  const rest: Partial<StockItem> = { ...item };
  delete rest.id;
  delete rest.ref;
  delete rest.preparedOn;
  delete rest.useBy;
  const { preparedOn, useBy } = item;
  // Read through the boundary, so an old item is checked like every stored one.
  return detailOf({
    ...rest,
    ...(preparedOn === undefined ? {} : { openedOn: preparedOn }),
    ...(useBy === undefined ? {} : { bestBefore: useBy }),
  });
};

/**
 * The records to put: one per thing, its items in the order given. Fields of other apps on an
 * old item (`x-...`) go with that item.
 */
export const legacyPuts = (
  records: readonly SyncRecord[],
  items: readonly StockItem[],
  keyOf: (ref: ComponentRef) => string,
): { put: { key: string; value: Value }[]; moved: string[]; kept: string[] } => {
  const byKey = new Map<string, StockItem[]>();
  for (const item of items) {
    const key = keyOf(item.ref);
    byKey.set(key, [...(byKey.get(key) ?? []), item]);
  }
  const put: { key: string; value: Value }[] = [];
  const moved: string[] = [];
  const kept: string[] = [];
  for (const [key, list] of byKey) {
    const before = liveValue(records, key);
    if (isStockValue(before)) {
      kept.push(key);
      continue;
    }
    const value = valueWith(
      before,
      list.map((item) => ({ detail: oldDetail(item) })),
    );
    const [first, ...rest] = list.map((item) => extrasOf(item as unknown as Value));
    for (const [field, v] of Object.entries(first ?? {})) if (!(field in value)) value[field] = v;
    if (Array.isArray(value.batches)) {
      value.batches = (value.batches as Value[]).map((batch, i) => ({ ...rest[i], ...batch }));
    }
    put.push({ key, value });
    moved.push(key);
  }
  return { put, moved, kept };
};

const isItem = (record: unknown): record is StockItem => {
  const r = record as Partial<StockItem> | null;
  return (
    typeof r?.id === 'string' &&
    (r.ref?.kind === 'ingredient' || r.ref?.kind === 'component') &&
    typeof r.ref.id === 'string'
  );
};

/** Moves Culina's own stock items into the space and then removes them from Culina's database. */
export async function moveLegacyStock(options: {
  own: OwnStore;
  shared: SharedStore;
  spaceId: string;
  now: () => string;
  keyOf: (ref: ComponentRef) => string;
}): Promise<MoveResult> {
  const { own, shared, spaceId, now, keyOf } = options;
  const listed = await own.list('stock');
  if (!listed.ok) return { ok: false, reason: 'read' };
  const items = listed.records.flatMap((record) => (isItem(record) ? [record] : []));
  let moved: string[] = [];
  let kept: string[] = [];
  if (items.length > 0) {
    try {
      await localChange(shared, spaceId, STOCK, now, (records) => {
        const decided = legacyPuts(records, items, keyOf);
        moved = decided.moved;
        kept = decided.kept;
        return { put: decided.put };
      });
    } catch {
      return { ok: false, reason: 'write' };
    }
  }
  // Tombstones of removed items are cleared too: nothing of the stock stays in Culina's database.
  const cleared = await own.clearKind('stock');
  return cleared.ok ? { ok: true, moved, kept } : { ok: false, reason: 'clear' };
}
