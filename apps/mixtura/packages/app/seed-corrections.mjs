// Applies Mixtura's parent corrections (engine data/mixtura/corrections.json)
// to the converted ingredients. The converter output stays the source's tree;
// only this file overrides a parent, each with a note and its evidence.

/**
 * @param {{ id: string, parentId?: string }[]} ingredients converted ingredients
 * @param {{ id: string, parentId: string }[]} corrections parent corrections
 * @returns {{ id: string, parentId?: string }[]} new list, inputs untouched
 */
export function applyCorrections(ingredients, corrections) {
  const to = new Map(corrections.map((c) => [c.id, c.parentId]));
  return ingredients.map((i) => (to.has(i.id) ? { ...i, parentId: to.get(i.id) } : i));
}
