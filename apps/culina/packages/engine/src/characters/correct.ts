// The cook's own correction of the characters of a dish. The computed set stays the default; a
// dish stores only what the cook takes away from it or adds to it, so a changed recipe still
// changes the rest. Pure: the computed ids and the order of the table come in.

/** What a dish stores: the characters the cook adds to the computed ones and those taken away. */
export interface CharacterCorrection {
  add?: readonly string[];
  remove?: readonly string[];
}

/**
 * The characters of a dish after the cook's correction, in the order of the table: the computed
 * ones without those taken away, and those added. An id named in both lists is shown (the cook
 * said the dish is so). An id the table does not know is left out: its row is gone.
 *
 * @param order - Every character id of the table, in its order.
 */
export const correctCharacters = (
  computed: readonly string[],
  correction: CharacterCorrection | undefined,
  order: readonly string[],
): string[] => {
  const add = new Set(correction?.add ?? []);
  const remove = new Set(correction?.remove ?? []);
  const base = new Set(computed);
  return order.filter((id) => add.has(id) || (base.has(id) && !remove.has(id)));
};

/**
 * The correction that turns the computed characters into the shown ones, or `undefined` when they
 * are equal. Each list is in the order of the table and never empty; ids outside it are dropped.
 */
export const correctionOf = (
  computed: readonly string[],
  shown: readonly string[],
  order: readonly string[],
): CharacterCorrection | undefined => {
  const base = new Set(computed);
  const want = new Set(shown);
  const add = order.filter((id) => want.has(id) && !base.has(id));
  const remove = order.filter((id) => base.has(id) && !want.has(id));
  if (add.length === 0 && remove.length === 0) return undefined;
  return { ...(add.length === 0 ? {} : { add }), ...(remove.length === 0 ? {} : { remove }) };
};

/**
 * A correction as one text for the comparison of two versions: `+id` for an added character,
 * `-id` for one taken away, added first, joined by ", "; `undefined` for none.
 */
export const correctionText = (correction: CharacterCorrection | undefined): string | undefined => {
  const parts = [
    ...(correction?.add ?? []).map((id) => `+${id}`),
    ...(correction?.remove ?? []).map((id) => `-${id}`),
  ];
  return parts.length === 0 ? undefined : parts.join(', ');
};
