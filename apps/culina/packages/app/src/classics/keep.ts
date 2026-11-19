// Keeping a classic in the notebook: the engine copies it as version 1 with its origin, the app
// writes the records. A classic itself is never written.
import { copyClassic } from '@culina/engine';
import type { Classic, Lang } from '@culina/engine';
import { adoptEntry } from '../catalogue/adopt';
import { newId, saveRecord, today } from '../notebook';
import type { Result } from '../store/types';
import { catalogueEntries } from './names';

export type KeepResult =
  | { ok: true; dishId: string }
  | { ok: false; reason: 'wanted'; names: string[] }
  | { ok: false; reason: 'store'; result: Result }
  | { ok: false; reason: 'engine' };

/**
 * Copies a classic into the notebook: first the ingredients it names from the catalogue (the same
 * adoption as the picker), then the components, then the dish.
 *
 * @param classic - A shipped classic.
 * @param portions - Portions of the copy.
 * @param lang - The content language of the copy's names.
 */
export const keepClassic = async (
  classic: Classic,
  portions: number,
  lang: Lang,
): Promise<KeepResult> => {
  const copied = copyClassic(classic, { portions, lang, date: today(), newId });
  if (!copied.ok) {
    return copied.error.code === 'wanted-ingredient'
      ? { ok: false, reason: 'wanted', names: copied.error.wanted }
      : { ok: false, reason: 'engine' };
  }
  const catalogue = catalogueEntries();
  const refs = [...copied.components.flatMap((c) => c.lines), ...copied.dish.slots]
    .map((line) => line.ref)
    .filter((ref) => ref.kind === 'ingredient');
  for (const ref of new Set(refs.map((r) => r.id))) {
    const entry = catalogue.get(ref);
    if (entry === undefined) continue;
    const adopted = await adoptEntry(entry, catalogue);
    if (!adopted.ok) return { ok: false, reason: 'store', result: adopted };
  }
  for (const component of copied.components) {
    const done = await saveRecord('components', component as never);
    if (!done.ok) return { ok: false, reason: 'store', result: done };
  }
  const done = await saveRecord('dishes', copied.dish as never);
  return done.ok
    ? { ok: true, dishId: copied.dish.id }
    : { ok: false, reason: 'store', result: done };
};
