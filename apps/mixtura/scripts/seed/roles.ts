// Roles by rule: the curated table (packages/engine/data/ingredient-properties.json)
// gives a role to tree nodes, everything below inherits it. A node with
// `null` stops the inheritance and is reported as unclassified, as is a
// node no table entry covers.
export type Role =
  'base' | 'modifier' | 'sweet' | 'sour' | 'bitter' | 'accent' | 'texture' | 'lengthener';

export interface RoleEntry {
  role: Role | null;
  basis: 'assumption';
  note?: string;
}

export interface RoleResult {
  /** Roles to write on the nodes the table names. */
  own: Map<string, Role>;
  /** Ids whose resolved role is unknown, with the reason. */
  unclassified: Map<string, string>;
}

/** `parentOf` is the parent in the output tree. */
export function applyRoles(
  ids: readonly string[],
  parentOf: (id: string) => string | undefined,
  table: Readonly<Record<string, RoleEntry>>,
): RoleResult {
  const own = new Map<string, Role>();
  for (const id of ids) {
    const entry = table[id];
    if (entry?.role) own.set(id, entry.role);
  }
  const unclassified = new Map<string, string>();
  for (const id of ids) {
    let cur: string | undefined = id;
    let found = false;
    while (cur !== undefined) {
      const entry = table[cur];
      if (entry) {
        if (entry.role === null) unclassified.set(id, `${cur} is marked unclassified`);
        found = true;
        break;
      }
      cur = parentOf(cur);
    }
    if (!found) unclassified.set(id, 'no table entry covers it');
  }
  return { own, unclassified };
}
