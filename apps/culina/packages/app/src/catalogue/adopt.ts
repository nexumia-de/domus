// Choosing a catalogue entry: it is copied into the notebook through the ordinary save path and
// from then on is the user's own ingredient. An entry already in the notebook is not written
// again, so the user's changes to it stay.
import type { ComponentRef } from '@culina/engine';
import { getIngredient, saveRecord } from '../notebook';
import type { IngredientRecord } from '../records';
import type { Result } from '../store/types';

export const adoptEntry = async (
  entry: IngredientRecord,
): Promise<Result<{ ref: ComponentRef }>> => {
  const ref: ComponentRef = { kind: 'ingredient', id: entry.id };
  if (getIngredient(entry.id) !== undefined) return { ok: true, ref };
  const done = await saveRecord('ingredients', entry);
  return done.ok ? { ok: true, ref } : done;
};
