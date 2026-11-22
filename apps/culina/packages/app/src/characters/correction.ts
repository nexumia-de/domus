// The cook's correction of a dish's characters as a record stores it, against the table of the
// app. Pure.
import { CHARACTER_TABLE } from './table';

/** The correction as a dish record holds it (`characters` in dish.schema.json). */
export interface StoredCorrection {
  add?: string[];
  remove?: string[];
}

/** Every character id, in the order of the table. */
export const CHARACTER_ORDER: readonly string[] = CHARACTER_TABLE.map((c) => c.id);

/** The correction as a record stores it: known ids, in the table's order, no empty list. */
export const normalCorrection = (
  correction: { add?: readonly string[]; remove?: readonly string[] } | undefined,
): StoredCorrection | undefined => {
  const add = CHARACTER_ORDER.filter((id) => correction?.add?.includes(id));
  // An id in both lists is shown (the engine's rule), so it is kept as added only.
  const remove = CHARACTER_ORDER.filter(
    (id) => correction?.remove?.includes(id) && !add.includes(id),
  );
  if (add.length === 0 && remove.length === 0) return undefined;
  return { ...(add.length === 0 ? {} : { add }), ...(remove.length === 0 ? {} : { remove }) };
};
