// Types of the specs module: comparing two versions of a drink and building
// the family of a drink (docs/screens-specs.md, docs/engine.md). Only the
// fields the functions read are named, so a stored spec fits as it is.

/** The part of a spec line a comparison reads. */
export interface DiffLine {
  ingredientId: string;
  amount: number;
  amountMax?: number;
  unit: string;
  /** Volume in ml of a `top` line. */
  topMl?: number;
  role?: string;
  optional?: boolean;
  note?: string;
  substitutes?: readonly { ingredientId: string; amount?: number; unit?: string }[];
}

/** The part of a spec a comparison reads. */
export interface DiffSpec {
  name?: string;
  templateId?: string;
  lines: readonly DiffLine[];
  method?: string;
  glass?: string;
  garnish?: string;
  notes?: string;
}

/** What differs on a line that exists on both sides. */
export type LineField = 'ingredient' | 'amount' | 'role' | 'optional' | 'note' | 'substitutes';

export interface LineDiff {
  kind: 'added' | 'removed' | 'changed';
  /** The line in the older spec; absent when added. */
  before?: DiffLine;
  /** The line in the newer spec; absent when removed. */
  after?: DiffLine;
  /** What differs, for `changed` only. */
  fields: LineField[];
}

export type SpecField = 'name' | 'template' | 'method' | 'glass' | 'garnish' | 'notes';

export interface FieldDiff {
  field: SpecField;
  /** The value in the older spec; absent when it had none. */
  before?: string;
  /** The value in the newer spec; absent when it has none. */
  after?: string;
}

export interface SpecDiff {
  lines: LineDiff[];
  fields: FieldDiff[];
  /** True when nothing differs (a different order of lines is no difference). */
  empty: boolean;
}

export interface DiffOptions {
  /** The role of a line, so a replaced ingredient in the same role reads as a change of that line. */
  roleOf?: (line: DiffLine) => string | undefined;
}

/** One entry of the list of changes of a riff. */
export type RiffChangeItem =
  { type: 'line'; line: LineDiff } | { type: 'field'; change: FieldDiff };

export interface RiffChange {
  /** Number of entries: every changed, added or removed line counts once. */
  count: number;
  items: RiffChangeItem[];
}

/** The part of a spec the family reads. */
export interface FamilySpec {
  id: string;
  lineageId: string;
  version: number;
  /** The spec this one was made from: for version 1 of a riff the parent spec. */
  parentId?: string;
  createdAt?: string;
}

export interface Family {
  lineageId: string;
  /** Lineage ids from the oldest known ancestor down to the direct parent. */
  ancestors: string[];
  /** The parent spec id the chain ends at when that spec is not in the data. */
  missingParent?: string;
  /** Other riffs of the same parent, in order of creation. */
  siblings: string[];
  /** Riffs of this drink, in order of creation. */
  children: string[];
  /** Lineage ids of a loop in the chain upward, when there is one; the chain stops before it repeats. */
  cycle?: string[];
}
