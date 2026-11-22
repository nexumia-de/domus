// Types of versions: the stored `version` object, the chain of a family and the diff between
// two versions. Every fallible function returns a result union and never throws.
import type { Amount } from '../amounts/types';
import type { PercentAmount } from '../scale/types';
import type { ComponentRef } from '../components/types';

/** The `version` object of a stored component or dish (data model, Version). */
export interface VersionMeta {
  /** The id of the first version of the family. */
  family: string;
  /** The previous version; in another family it makes the record the first of a variation. */
  parent?: string;
  /** `YYYY-MM-DD`, supplied by the host. */
  date: string;
  change?: string;
  reason?: string;
}

/** What the chain and family functions read of a record. */
export interface Versioned {
  id: string;
  version: VersionMeta;
}

export type VersionErrorCode = 'unknown-version' | 'different-family';

export interface VersionError {
  code: VersionErrorCode;
  /** The record id the error is about. */
  id: string;
}

/** The versions of one family, oldest first, and the head. */
export interface FamilyVersions<T extends Versioned> {
  /** Oldest first; position + 1 is the version number. */
  versions: T[];
  head: T;
}
export type FamilyResult<T extends Versioned> =
  ({ ok: true } & FamilyVersions<T>) | { ok: false; error: VersionError };

/** One variation: the family it starts and that family's head. */
export interface Variation<T extends Versioned> {
  family: string;
  first: T;
  head: T;
}

/** Where a record's family came from. */
export type VariationParent<T extends Versioned> =
  { kind: 'none' } | { kind: 'parent'; record: T } | { kind: 'removed' };

/** A line as stored by components (`lines`) or dishes (`slots`), reduced to what is compared. */
export interface DiffLine {
  ref: ComponentRef;
  amount?: Amount | PercentAmount;
  role?: string;
  state?: string;
  note?: string;
  optional?: boolean;
}

/** What differs on a line present in both versions. */
export type LineField = 'ref' | 'amount' | 'role' | 'state' | 'note' | 'optional';

export interface LineChange {
  type: 'line';
  kind: 'added' | 'removed' | 'changed';
  before?: DiffLine;
  after?: DiffLine;
  /** For `changed`: what differs. */
  fields: LineField[];
}

export type VersionField =
  | 'name'
  | 'role'
  | 'templateId'
  | 'percentBase'
  | 'yield'
  | 'method'
  | 'portions'
  | 'course'
  | 'cuisine'
  | 'characters'
  | 'note';

export interface FieldChange {
  type: 'field';
  field: VersionField;
  /** Text as a screen shows it; absent when the field was empty. */
  before?: string;
  after?: string;
}

export type VersionChange = LineChange | FieldChange;

export interface VersionDiff {
  /** Line changes first, then fields. */
  changes: VersionChange[];
  /** True when nothing differs; a different order of lines is no difference. */
  empty: boolean;
}

export type DiffResult = { ok: true; diff: VersionDiff } | { ok: false; error: VersionError };

/** The part of a stored component the diff reads. */
export interface DiffComponent extends Versioned {
  name: string;
  role?: string;
  templateId?: string;
  percentBase?: string;
  lines: readonly DiffLine[];
  yield?: { amount: Amount };
  method?: readonly string[];
}

/** The part of a stored dish the diff reads. */
export interface DiffDish extends Versioned {
  name: string;
  portions?: number;
  /** A course id; the diff gives the id, the screen its name. */
  course?: string;
  /** A country code; the diff gives the code, the screen its name. */
  cuisine?: string;
  /** The cook's correction of the characters; the diff gives `+id` and `-id`, the screen the names. */
  characters?: { add?: readonly string[]; remove?: readonly string[] };
  slots: readonly { role: string; ref: ComponentRef; amount?: Amount; optional?: boolean }[];
  note?: string;
}
