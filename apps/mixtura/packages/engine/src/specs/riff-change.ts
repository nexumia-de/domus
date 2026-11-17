import type { RiffChange, SpecDiff } from './types';

/**
 * Turns the difference between a riff and its parent into a list of changes
 * the family view can name ("one change", "3 changes") and spell out. A riff
 * has its own name by definition, so a different name is not counted.
 *
 * @param diff The difference from `diffSpecs`, parent as the older side.
 * @returns The number of changes and the entries, lines first, then fields other than the name.
 */
export function summariseRiff(diff: SpecDiff): RiffChange {
  const items: RiffChange['items'] = [
    ...diff.lines.map((line) => ({ type: 'line' as const, line })),
    ...diff.fields
      .filter((change) => change.field !== 'name')
      .map((change) => ({ type: 'field' as const, change })),
  ];
  return { count: items.length, items };
}
