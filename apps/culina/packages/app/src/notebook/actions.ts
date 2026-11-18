// Writes: through the store first, the cache only after the store accepted the record. Every
// write is validated by the store. Delete is a tombstone; undo puts the kept record again.
import { fail, type Result } from '../store/types';
import type { ComponentRecord, DishRecord, IngredientRecord } from '../records';
import { emit, sorted, state } from './state';

export type WritableKind = 'ingredients' | 'components' | 'dishes';
type RecordOf = {
  ingredients: IngredientRecord;
  components: ComponentRecord;
  dishes: DishRecord;
};

const cache = {
  ingredients: () => state.ingredients,
  components: () => state.components,
  dishes: () => state.dishes,
};

const setList = (kind: WritableKind, list: { id: string; name: string }[]): void => {
  const next = sorted(list);
  if (kind === 'ingredients') state.ingredients = next as IngredientRecord[];
  else if (kind === 'components') state.components = next as ComponentRecord[];
  else state.dishes = next as DishRecord[];
};

/** Validates and stores a record (new or changed), then shows it in the cache. */
export const saveRecord = async <K extends WritableKind>(
  kind: K,
  record: RecordOf[K],
): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const written = await state.store.put(kind, record);
  if (!written.ok) return written;
  const others = (cache[kind]() as { id: string; name: string }[]).filter(
    (r) => r.id !== record.id,
  );
  setList(kind, [...others, record]);
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
