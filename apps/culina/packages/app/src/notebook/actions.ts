// Writes: through the store first, the cache only after the store accepted the record. Every
// write is validated by the store. Delete is a tombstone; undo puts the kept record again.
import { fail, type Result } from '../store/types';
import type { ComponentRecord, DishRecord, IngredientRecord, TastingRecord } from '../records';
import { emit, sorted, state } from './state';

/** Stock is not among them: it is written into the shared collection of a space (stock.ts). */
export type WritableKind = 'ingredients' | 'components' | 'dishes' | 'tastings';
type RecordOf = {
  ingredients: IngredientRecord;
  components: ComponentRecord;
  dishes: DishRecord;
  tastings: TastingRecord;
};

const cache = {
  ingredients: () => state.ingredients,
  components: () => state.components,
  dishes: () => state.dishes,
  tastings: () => state.tastings,
};

const setList = (kind: WritableKind, list: { id: string; name?: string }[]): void => {
  if (kind === 'tastings') {
    state.tastings = list as unknown as TastingRecord[];
    return;
  }
  const next = sorted(list as { id: string; name: string }[]);
  if (kind === 'ingredients') state.ingredients = next as IngredientRecord[];
  else if (kind === 'components') state.components = next as ComponentRecord[];
  else state.dishes = next as DishRecord[];
};

/**
 * Validates and stores a record (new or changed), then shows it in the cache. A version record
 * of a component or dish is immutable: one that is already stored is refused, a change is a
 * new version record (docs/data-model.md, Version).
 */
export const saveRecord = async <K extends WritableKind>(
  kind: K,
  record: RecordOf[K],
): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  if (
    (kind === 'components' || kind === 'dishes') &&
    (cache[kind]() as { id: string }[]).some((r) => r.id === record.id)
  ) {
    return fail({ code: 'invalid-record', issues: [{ path: 'id', keyword: 'immutable' }] });
  }
  const written = await state.store.put(kind, record);
  if (!written.ok) return written;
  const others = (cache[kind]() as { id: string }[]).filter((r) => r.id !== record.id);
  setList(kind, [...others, record as unknown as { id: string }]);
  emit();
  return { ok: true };
};

/** Tombstones a record; the result carries what was removed, for Undo. */
export const removeRecord = async <K extends WritableKind>(
  kind: K,
  id: string,
): Promise<Result<{ removed: RecordOf[K] }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const list = cache[kind]() as unknown as RecordOf[K][];
  const kept = list.find((r) => (r as { id: string }).id === id);
  const done = await state.store.remove(kind, id);
  if (!done.ok) return done;
  setList(
    kind,
    (list as unknown as { id: string; name: string }[]).filter((r) => r.id !== id),
  );
  emit();
  return kept === undefined ? fail({ code: 'not-found' }) : { ok: true, removed: kept };
};
