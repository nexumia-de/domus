// Types of the export file: the kinds of records, the validators the host passes in, and the
// errors of reading a file. Every fallible function returns a result union and never throws.

/**
 * The kinds of user records, named like the collections of the export file. Stock is not among
 * them since version 2: it is the shared collection `stock` of a space, not Culina's data
 * (docs/decisions/stock-in-spaces.md). `skills` (the techniques marked as learned) since version 3,
 * `cooked` (the date a dish was last cooked) since version 4.
 */
export const EXPORT_KINDS = [
  'ingredients',
  'templates',
  'components',
  'dishes',
  'affinities',
  'tastings',
  'skills',
  'cooked',
] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/** The format version from which a kind is a collection of the file; absent means version 1. */
export const KIND_SINCE: Partial<Record<ExportKind, number>> = { skills: 3, cooked: 4 };

/** A record as the schemas describe it; every kind has a string `id`. */
export type ExportRecord = { id: string } & Record<string, unknown>;

/** Live records per kind. A kind that is absent or empty has no record. */
export type RecordSets = Partial<Record<ExportKind, readonly ExportRecord[]>>;

/** The same with every kind present. */
export type FullRecordSets = Record<ExportKind, ExportRecord[]>;

/** What a compiled schema validator offers (Ajv standalone code has this shape). */
export interface RecordValidator {
  (data: unknown): boolean;
  errors?: { instancePath: string; keyword: string }[] | null;
}

/** One validator per kind, compiled from `packages/engine/schemas/` by the host. */
export type RecordValidators = Record<ExportKind, RecordValidator>;

/** The envelope as written to the file. */
export interface ExportEnvelope extends Partial<Record<ExportKind, ExportRecord[]>> {
  format: 'culina-export';
  formatVersion: number;
  seedVersion?: string;
  exportedAt?: string;
}

/** A pure step from export version `from` to `to` (= from + 1) over the parsed envelope. */
export interface ExportMigration {
  from: number;
  to: number;
  migrate(envelope: Record<string, unknown>): Record<string, unknown>;
}

export type ExportErrorCode =
  | 'not-json'
  | 'not-an-export'
  | 'bad-version'
  | 'newer-version'
  | 'bad-migration'
  | 'unknown-field'
  | 'not-a-list'
  | 'invalid-record'
  | 'duplicate-id';

/** Never carries record text: kinds, positions, ids and schema paths only. */
export interface ExportError {
  code: ExportErrorCode;
  /** newer-version: the version found and the newest this reader knows. */
  found?: number;
  supported?: number;
  kind?: ExportKind;
  /** Position in the kind's list. */
  index?: number;
  id?: string;
  /** unknown-field: the field. */
  field?: string;
  /** invalid-record: where the schema was not met. */
  issues?: { path: string; keyword: string }[];
}

export type ExportFail = { ok: false; error: ExportError };

/** What a file holds once it is read and valid. */
export interface ExportContent {
  formatVersion: number;
  seedVersion?: string;
  exportedAt?: string;
  records: FullRecordSets;
  /**
   * The version the file was written in, before the migration chain. A kind that came after it
   * (`KIND_SINCE`) is absent because the file could not hold it, not because it was empty.
   */
  fileVersion: number;
  /** How many stock items a file of version 1 held; they are left out. Absent when none. */
  stockLeftOut?: number;
}

export type ParseResult = { ok: true; content: ExportContent } | ExportFail;
