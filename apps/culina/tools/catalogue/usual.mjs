// The usual member of a parent whose rows do not agree: named in usual.json (a judgement of the
// project, with its reason), checked against the tree and written as `x-group.usual`. Pure: no
// file access, no clock. The rule is stated in docs/ingredient-catalogue.md (Usual member);
// change both together. No number is typed: the range in the source is read from the rows.
const MAX_SOURCE = 500;

/** Food rows below the entry `id` (at any depth). */
const rowsBelow = (id, entries) => {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const isBelow = (entry) => {
    for (let at = entry.parentId, depth = 0; at !== undefined && depth < 20; depth++) {
      if (at === id) return true;
      at = byId.get(at)?.parentId;
    }
    return false;
  };
  return entries.filter((e) => e['x-fdc'] !== undefined && isBelow(e));
};

/**
 * Adds `x-group.usual = { id, source }` to every parent named in `table.groups`. Throws when a
 * parent is not in the catalogue, is not a parent, or its usual member is not a food row below
 * it: the table is then out of date and must be fixed, not the rows.
 */
export const applyUsual = (entries, table) => {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const usualOf = new Map();
  for (const { group, usual, why } of table.groups) {
    const parent = byId.get(group);
    if (parent === undefined || parent['x-group'] === undefined) {
      throw new Error(`usual.json: ${group} is not a parent of the catalogue`);
    }
    const rows = rowsBelow(group, entries);
    const member = rows.find((r) => r['x-fdc'].id === usual);
    if (member === undefined) throw new Error(`usual.json: FDC ${usual} is not below ${group}`);
    if (usualOf.has(group)) throw new Error(`usual.json: ${group} is named twice`);
    const kcal = rows.map((r) => r['x-nutrition']?.per100g.kcal).filter((v) => v !== undefined);
    const range =
      kcal.length === 0
        ? ''
        : ` The ${rows.length} food rows below range from ${Math.min(...kcal)} to ${Math.max(...kcal)} kcal per 100 g.`;
    const source = `Judgement of the project, tools/catalogue/usual.json (2026-11-21): FDC ID ${usual} (${member['x-fdc'].description}): ${why}.${range}`;
    if (source.length > MAX_SOURCE)
      throw new Error(`usual.json: the source of ${group} passes ${MAX_SOURCE} characters`);
    usualOf.set(group, { id: member.id, source });
  }
  return entries.map((e) => {
    const usual = usualOf.get(e.id);
    return usual === undefined ? e : { ...e, 'x-group': { ...e['x-group'], usual } };
  });
};
