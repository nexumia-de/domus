// Comparing two versions of a drink: the general comparison
// (specs/diff.ts) with the drink fields method, glass and garnish and the
// volume of a `top` line as part of the amount.
import { diffVersions } from '@nexumia-de/materia';
import type { DiffDomain } from '@nexumia-de/materia';
import type { DiffLine, DiffOptions, DiffSpec, FieldDiff, LineDiff, SpecField } from './types';

const DRINK: DiffDomain<DiffLine, DiffSpec, SpecField> = {
  fields: [
    ['name', (s) => s.name],
    ['template', (s) => s.templateId],
    ['method', (s) => s.method],
    ['glass', (s) => s.glass],
    ['garnish', (s) => s.garnish?.trim()],
    ['notes', (s) => s.notes?.trim()],
  ],
  amountKeys: ['topMl'],
};

/**
 * Compares two versions of a drink: lines added, removed and changed (another
 * ingredient, amount, role, optional flag, note or substitutes), then name,
 * template, method, glass, garnish and notes. Lines are matched, not
 * compared by position: first identical lines, then lines of the same
 * ingredient, then lines in the same role, so a different order is no
 * difference and a replaced ingredient reads as one changed line.
 *
 * @param before The older spec.
 * @param after The newer spec.
 * @param options `roleOf` gives the role of a line (explicit or the ingredient's).
 * @returns The differences; `empty` is true when there are none.
 */
export function diffSpecs(
  before: DiffSpec,
  after: DiffSpec,
  options: DiffOptions = {},
): { lines: LineDiff[]; fields: FieldDiff[]; empty: boolean } {
  return diffVersions(before, after, options, DRINK);
}
