// The role table: which catalogue ingredients or groups fill a role of a ratio card or of a dish
// (data/ingredient-roles.json). The catalogue file has no roles (the USDA data carries none); the
// table adds them when the catalogue is read, so a copy in the notebook has them and the finder
// meets them through the tree (a role on a group covers every food below it). An entry that the
// catalogue already gives roles keeps its own.
import table from '../../data/ingredient-roles.json';
import type { IngredientRecord } from '../records';

export interface RoleEntry {
  id: string;
  roles: readonly string[];
  basis: string;
}

export const ROLE_TABLE: readonly RoleEntry[] = table.entries;

const byId = new Map(ROLE_TABLE.map((e) => [e.id, e.roles]));

/** The entries with the table's roles added where the entry has none. */
export const withRoles = (entries: readonly IngredientRecord[]): IngredientRecord[] =>
  entries.map((e) => {
    const roles = byId.get(e.id);
    return roles === undefined || e.roles !== undefined ? e : { ...e, roles: [...roles] };
  });
