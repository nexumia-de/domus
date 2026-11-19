// Types of ratio templates, their resolution, the range check and scaling.

/** A usual range in the same parts as the part it belongs to. */
export interface PartRange {
  min: number;
  max: number;
}

/** One role of a root template. */
export interface TemplatePart {
  role: string;
  parts: number;
  range?: PartRange;
}

/** A change a derivative makes to its parent's parts. */
export type TemplateChange =
  | { op: 'add'; role: string; parts: number; range?: PartRange }
  | { op: 'remove'; role: string }
  | { op: 'set'; role: string; parts: number; range?: PartRange }
  | { op: 'swap'; role: string; ingredientClass: string };

/** A ratio template as stored (`template.schema.json`): a root or a derivative. */
export interface RatioTemplate {
  id: string;
  name: string;
  /** A row of docs/ratios.md or `user`: a pointer into the repository, never shown. */
  source: string;
  /** What the card shows as the source: author, title and the page where the data has it. */
  references?: { author: string; title: string; page?: string }[];
  /** Derivatives only: the template this one changes. */
  parentId?: string;
  /** The role whose parts are 100 percent; inherited from the nearest ancestor that has one. */
  anchor?: string;
  /** Roots only. */
  parts?: TemplatePart[];
  /** Derivatives only; applied in order. */
  changes?: TemplateChange[];
  note?: string;
}

/** A role of a resolved template. */
export interface EffectivePart {
  role: string;
  parts: number;
  range?: PartRange;
  /** Set by a `swap`; the class that now fills the role. */
  ingredientClass?: string;
}

/** A template with its parent chain applied. */
export interface EffectiveTemplate {
  id: string;
  anchor?: string;
  parts: EffectivePart[];
  /** Template ids, root first, this template last. */
  lineage: string[];
}

/** Why templates could not be resolved or queried: errors in the template data, not in a recipe. */
export type TemplateErrorCode =
  | 'unknown-template'
  | 'unknown-parent'
  | 'cycle'
  | 'duplicate-id'
  | 'not-root-or-derivative'
  | 'invalid-parts'
  | 'invalid-range'
  | 'duplicate-role'
  | 'role-exists'
  | 'unknown-role'
  | 'anchor-removed';

/** A template error; the fields name what is relevant to the code. */
export interface TemplateError {
  code: TemplateErrorCode;
  /** The template concerned. */
  templateId?: string;
  parentId?: string;
  role?: string;
  /** For `cycle`: ids from the starting template up to the first repeated id, which ends the path. */
  path?: string[];
}

/** Result of `resolveTemplate`. */
export type ResolveResult =
  { ok: true; template: EffectiveTemplate } | { ok: false; error: TemplateError };

/** Result of `templateAncestors`. */
export type AncestorsResult = { ok: true; ids: string[] } | { ok: false; error: TemplateError };

/** Why a check, scaling or percentage function could not run. */
export type RatioErrorCode =
  'no-anchor' | 'unknown-anchor' | 'anchor-not-measured' | 'invalid-value' | 'unknown-role';

/** An error about the input of a check, scaling or percentage function; `role` names the role concerned. */
export interface RatioError {
  code: RatioErrorCode;
  role?: string;
}

/** Where an amount lies against a usual range. */
export type RangePosition = 'below' | 'within' | 'above';

/** One role of a range check. All parts are relative to the template, numbers only. */
export interface RoleCheck {
  role: string;
  /** Actual parts, normalised so the anchor has its template parts. */
  parts: number;
  templateParts: number;
  /** Actual minus template parts. */
  deltaParts: number;
  /** Percent of the sum of all amounts given. */
  sharePct: number;
  /** Percent of the sum of the template's parts. */
  templateSharePct: number;
  /** Only when the template gives a range for the role. */
  range?: PartRange;
  /** Only with a range. */
  position?: RangePosition;
  /** Only with a range: parts outside it, in parts; 0 within. */
  distance?: number;
}

/** Result of `checkRatio`. */
export type CheckResult =
  | {
      ok: true;
      /** The anchor role used. */
      anchor: string;
      /** One entry per template role, in template order. */
      roles: RoleCheck[];
      /** Template roles with no amount given. */
      notUsed: string[];
      /** Roles given that the template does not have; they count in the share total. */
      extra: string[];
    }
  | { ok: false; error: RatioError };

/** Result of `scaleFromAnchor`. */
export type ScaleAnchorResult =
  { ok: true; g: Record<string, number> } | { ok: false; error: RatioError };

/** Result of `templatePercent`. */
export type PercentResult =
  { ok: true; pct: Record<string, number> } | { ok: false; error: RatioError };
