/** Shared types of the local store. Rows are materia's sync record: see docs/data-model.md. */

/** One object store per entity kind, named like the collections of the export file. */
export const KINDS = [
  'ingredients',
  'templates',
  'components',
  'dishes',
  'stock',
  'affinities',
  'tastings',
  'skills',
] as const;
export type Kind = (typeof KINDS)[number];

/**
 * The kinds that are in the export file and in a backup. `skills` (which techniques the user has
 * learned) is personal state of this device's notebook and is stored and synced but not exported yet
 * (docs/data-model.md, Skill state). `stock` is only where items from before 2026-11-20 wait for
 * their move into the shared collection of a space (src/shared-stock/legacy.ts); nothing writes it.
 */
export type ExportedKind = Exclude<Kind, 'skills' | 'stock'>;

export const isKind = (value: unknown): value is Kind => KINDS.some((kind) => kind === value);

/** A record as the schemas describe it; every kind has a string `id`. */
export type StoredRecord = { id: string } & Record<string, unknown>;

/**
 * A stored row: materia's `SyncRecord`. `updatedAt` is an ISO 8601 UTC instant with `Z`;
 * a tombstone has `deleted: true` and no `value`.
 */
export interface Row {
  key: string;
  updatedAt: string;
  deleted?: true;
  value?: StoredRecord;
}

export type Rows = Record<Kind, Row[]>;

export const emptyRows = (): Rows => ({
  ingredients: [],
  templates: [],
  components: [],
  dishes: [],
  stock: [],
  affinities: [],
  tastings: [],
  skills: [],
});

export type ErrorCode =
  | 'invalid-record'
  | 'not-found'
  | 'quota-exceeded'
  | 'unavailable'
  | 'newer-schema'
  | 'migration-failed';

/** Never holds record text: paths and ids only. */
export interface StoreError {
  code: ErrorCode;
  /** invalid-record: where the schema was not met. */
  issues?: { path: string; keyword: string }[];
  /** newer-schema: the version found and the newest this app knows. */
  found?: number;
  supported?: number;
  /** migration-failed: the step (`1->2`) and a short reason. */
  step?: string;
  reason?: string;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: StoreError };

export const fail = (error: StoreError): { ok: false; error: StoreError } => ({
  ok: false,
  error,
});

/** A pure step from schema version `from` to `to` (= from + 1) over plain data. */
export interface Migration {
  from: number;
  to: number;
  migrate(rows: Rows): Rows;
}
