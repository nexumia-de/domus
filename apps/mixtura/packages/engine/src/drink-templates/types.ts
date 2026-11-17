// The drink shapes of the template types: the general types
// (templates/types.ts) with the drink `Role` union, the alcohol class of a
// variant, the glass and the usual ABV, sugar and acid ranges.
import type { Role } from '../drink-ingredients/types';
import type { Id } from '../ingredients/types';
import type * as General from '../templates/types';
import type { Range, TemplateEvidence } from '../templates/types';

export type TemplateSlot = General.TemplateSlot<Role>;

/** A Template of the data model (schemas/template.schema.json). */
export interface Template extends General.Template<Role> {
  /** Variant for drinks of this alcohol class; needs `parentId` (docs/templates.md#variants-by-alcohol-class). */
  alcohol?: 'none' | 'low';
  glass?: Id;
  usual?: { abv?: Range; sugar?: Range; acid?: Range; evidence?: TemplateEvidence };
}

/** A spec line as matching reads it: a subset of the Spec line of the data model. */
export type MatchLine = General.MatchLine<Role>;

export type MatchSpec = General.MatchSpec<Role>;

export interface MatchOptions extends General.MatchOptions {
  /** The drink's alcohol class from `classifyAlcohol`; absent leaves every variant out (docs/templates.md#variants-by-alcohol-class). */
  alcohol?: 'none' | 'low' | 'standard' | 'unknown';
}

export type SlotFill = General.SlotFill<Role>;

export type SlotAssignment = General.SlotAssignment<Role>;

export type Candidate = General.Candidate<Role>;

export type MatchResult = General.MatchResult<Role>;

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
