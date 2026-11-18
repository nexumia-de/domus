// The drink shapes of the version comparison: the general types
// (specs/types.ts) with the volume of a `top` line and the drink fields
// method, glass and garnish.
import type * as General from '@nexumia-de/materia';

/** The part of a spec line a comparison reads. */
export interface DiffLine extends General.VersionLine {
  /** Volume in ml of a `top` line. */
  topMl?: number;
}

/** The part of a spec a comparison reads. */
export interface DiffSpec extends General.VersionSpec<DiffLine> {
  method?: string;
  glass?: string;
  garnish?: string;
}

export type LineDiff = General.LineDiffOf<DiffLine>;

export type SpecField = 'name' | 'template' | 'method' | 'glass' | 'garnish' | 'notes';

export type FieldDiff = General.FieldDiffOf<SpecField>;

export type SpecDiff = General.SpecDiffOf<DiffLine, SpecField>;

export type DiffOptions = General.DiffOptionsOf<DiffLine>;

/** One entry of the list of changes of a riff. */
export type RiffChangeItem = General.RiffChangeItemOf<DiffLine, SpecField>;

export type RiffChange = General.RiffChangeOf<DiffLine, SpecField>;
