// Types of cross-record validation. The record types are structural subsets
// of the stored shapes: a record valid against its schema is accepted as is,
// extra fields are ignored. `validateModel` never throws; it returns findings.
import type { ComponentRef } from '../components/types';
import type { RatioTemplate } from '../ratios/types';

/** The `version` object of a component or dish: the fields that refer to other records. */
export interface ModelVersion {
  /** The id of the first version: a record of the same kind. */
  family: string;
  /** The previous version, or the record this one is a variation of: a record of the same kind. */
  parent?: string;
}

export interface ModelIngredient {
  id: string;
  parentId?: string;
}

export interface ModelComponent {
  id: string;
  templateId?: string;
  lines: readonly { ref: ComponentRef }[];
  version?: ModelVersion;
}

export interface ModelDish {
  id: string;
  slots: readonly { ref: ComponentRef }[];
  version?: ModelVersion;
}

export interface ModelStock {
  id: string;
  ref: ComponentRef;
}

export interface ModelAffinity {
  id: string;
  a: string;
  b: string;
}

export interface ModelTasting {
  id: string;
  /** The version record the note was made on: a component or a dish. */
  ref: { kind: 'component' | 'dish'; id: string };
}

/** The records to check, by the collection names of the export file. A missing collection is empty. */
export interface ModelInput {
  ingredients?: readonly ModelIngredient[];
  templates?: readonly RatioTemplate[];
  components?: readonly ModelComponent[];
  dishes?: readonly ModelDish[];
  stock?: readonly ModelStock[];
  affinities?: readonly ModelAffinity[];
  tastings?: readonly ModelTasting[];
}

/** The kind of record a finding is about. */
export type EntityKind =
  'ingredient' | 'template' | 'component' | 'dish' | 'stock' | 'affinity' | 'tasting';

export type FindingCode =
  | 'duplicate-id'
  | 'unknown-ingredient'
  | 'unknown-component'
  | 'unknown-dish'
  | 'unknown-template'
  | 'unknown-parent'
  | 'unknown-family'
  | 'cycle'
  | 'anchor-not-a-role'
  | 'invalid-range'
  | 'not-root-or-derivative'
  | 'invalid-parts'
  | 'duplicate-role'
  | 'role-exists'
  | 'unknown-role';

/** One named problem in the data, with the ids involved. */
export interface Finding {
  code: FindingCode;
  kind: EntityKind;
  /** The record the problem is in. */
  id: string;
  /** The field, for example `lines[2].ref` or `parts[0].range`. */
  path?: string;
  /** The id referred to that does not exist. */
  ref?: string;
  /** `cycle`: the ids around the cycle, from its smallest id, ending with that id again. */
  ids?: string[];
  /** The role concerned (templates). */
  role?: string;
}

export interface ValidationResult {
  /** True when there are no findings. */
  ok: boolean;
  findings: Finding[];
}
