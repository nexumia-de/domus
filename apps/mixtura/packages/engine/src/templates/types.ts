// Types of the templates module (docs/templates.md). Results are numbers,
// statuses and reasons; nothing in them judges the drink.
import type { UnitOverrides } from '../amounts/index';
import type { Id, Role } from '../ingredients/types';

export type TemplateEvidence = 'verified' | 'secondary' | 'derived' | 'assumption';

export interface Range {
  min: number;
  max: number;
}

export interface TemplateSlot {
  id: Id;
  role: Role;
  minParts: number;
  maxParts: number;
  optional?: boolean;
  note?: string;
}

/** A Template of the data model (schemas/template.schema.json). */
export interface Template {
  id: Id;
  name: string;
  parentId?: Id;
  slots: TemplateSlot[];
  slotEvidence?: TemplateEvidence;
  method: Id;
  glass?: Id;
  usual?: { abv?: Range; sugar?: Range; acid?: Range; evidence?: TemplateEvidence };
  source?: { name: string; licence: string; url?: string; note?: string };
  notes?: string;
}

/** A spec line as matching reads it: a subset of the Spec line of the data model. */
export interface MatchLine {
  ingredientId: Id;
  amount: number;
  /** Upper end of a range line; the middle of the range is used. */
  amountMax?: number;
  /** Unit id from units.json. */
  unit: string;
  /** Role in this drink; absent means the ingredient's resolved role. */
  role?: Role;
  /** Volume in ml of a `top` line; without it the line has a role but no ratio. */
  topMl?: number;
}

export interface MatchSpec {
  /** An explicit template id is never overridden. */
  templateId?: Id;
  lines: readonly MatchLine[];
}

export interface MatchOptions {
  unitOverrides?: UnitOverrides;
}

export type UnassignedReason = 'unknown-ingredient' | 'unknown-role' | 'no-slot-for-role';
export type UnmeasuredReason = 'mass' | 'top-without-volume' | 'invalid-amount';

export interface Unassigned {
  index: number;
  ingredientId: Id;
  reason: UnassignedReason;
}

export interface SlotFill {
  slotId: Id;
  role: Role;
  optional: boolean;
  /** Indexes into the spec's lines. */
  lineIndexes: number[];
  /** Sum of the lines' volumes; absent if the slot is empty or a line has no volume. */
  ml?: number;
  /** Why `ml` is absent although the slot has lines. */
  unmeasured?: UnmeasuredReason;
}

export interface SlotAssignment {
  /** One entry per slot of the template, in the template's order. */
  fills: SlotFill[];
  unassigned: Unassigned[];
  emptyRequired: Id[];
  emptyOptional: Id[];
}

export type RatioStatus = 'reference' | 'within' | 'below' | 'above' | 'unmeasured' | 'empty';

export interface SlotRatio {
  slotId: Id;
  status: RatioStatus;
  /** Parts against the reference slot; absent for `empty` and `unmeasured`. */
  parts?: number;
  minParts: number;
  maxParts: number;
}

export interface Candidate {
  templateId: Id;
  /** 1 is the best of this result. */
  rank: number;
  /** True if no required slot is empty, no line is unassigned and every measured ratio is in its band. */
  fits: boolean;
  /** Empty required slots + unassigned lines + relative distance of each ratio outside its band. */
  distance: number;
  /** Relative distance of each measured ratio from the middle of its band; breaks ties of `distance`. */
  offset: number;
  assignment: SlotAssignment;
  ratios: SlotRatio[];
}

export interface Chosen {
  templateId: Id;
  basis: 'explicit' | 'suggested';
  /** False if an explicit id names no template in the list. */
  known: boolean;
  /** For a suggestion: true if the next candidate had the same distance and offset and the id order decided. */
  tieBrokenById?: boolean;
}

export interface MatchResult {
  /** Absent is the normal "no template" outcome. */
  chosen?: Chosen;
  candidates: Candidate[];
}

export type RangeFigure = 'abv' | 'sugar' | 'acid';
export type RangeStatus = 'within' | 'below' | 'above' | 'unknown';

export interface RangeCheck {
  figure: RangeFigure;
  status: RangeStatus;
  value?: number;
  range?: Range;
  /** Evidence of the range; `unstated` if the template does not say. */
  evidence?: TemplateEvidence | 'unstated';
  sourceName?: string;
  /** Why the status is `unknown`. */
  reason?: string;
  missingIds?: Id[];
}
