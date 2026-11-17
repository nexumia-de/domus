// The current layout of the database: the object stores, their keys and
// indexes. Data only; migrations.ts builds it step by step and a test
// checks that the migrated result equals this table.

export const DB_NAME = 'mixtura';

/** Raise with every change of `stores`, and add a migration for it. */
export const SCHEMA_VERSION = 3;

export interface IndexDef {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
}

export interface StoreDef {
  name: string;
  keyPath: string;
  indexes: IndexDef[];
}

export const stores: readonly StoreDef[] = [
  {
    name: 'specs',
    keyPath: 'id',
    // One record per version (docs/data-model.md#spec); versions of a drink
    // share `lineageId`.
    indexes: [
      { name: 'lineageId', keyPath: 'lineageId' },
      { name: 'lineage-version', keyPath: ['lineageId', 'version'], unique: true },
      { name: 'templateId', keyPath: 'templateId' },
      { name: 'status', keyPath: 'status' },
    ],
  },
  {
    name: 'ingredients',
    keyPath: 'id',
    // Prepared ingredients are ingredients with `prepared` set.
    indexes: [
      { name: 'parentId', keyPath: 'parentId' },
      { name: 'level', keyPath: 'level' },
    ],
  },
  { name: 'templates', keyPath: 'id', indexes: [{ name: 'parentId', keyPath: 'parentId' }] },
  { name: 'affinities', keyPath: 'id', indexes: [] },
  { name: 'stock', keyPath: 'ingredientId', indexes: [] },
  { name: 'settings', keyPath: 'key', indexes: [] },
  { name: 'meta', keyPath: 'key', indexes: [] },
  // Unsaved editor state, one record per editor address (`draft/<id>`); never exported.
  { name: 'drafts', keyPath: 'key', indexes: [] },
];
