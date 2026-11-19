// Choosing a catalogue entry: it is copied into the notebook through the ordinary save path and
// from then on is the user's own ingredient. An entry already in the notebook is not written
// again, so the user's changes to it stay. The entries above it in the catalogue tree (its
// parent chain, root first) are copied the same way, so the notebook's tree is whole.
import type { ComponentRef } from '@culina/engine';
import { getIngredient, saveRecord } from '../notebook';
import type { IngredientRecord } from '../records';
import type { Result } from '../store/types';
import { chainOf } from './tree';

export const adoptEntry = async (
  entry: IngredientRecord,
  catalogue: ReadonlyMap<string, IngredientRecord> = new Map(),
): Promise<Result<{ ref: ComponentRef }>> => {
  const ref: ComponentRef = { kind: 'ingredient', id: entry.id };
  for (const record of [...chainOf(entry, catalogue), entry]) {
    if (getIngredient(record.id) !== undefined) continue;
    const done = await saveRecord('ingredients', record);
    if (!done.ok) return done;
  }
  return { ok: true, ref };
};
