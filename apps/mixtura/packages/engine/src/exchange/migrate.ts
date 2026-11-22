// Older export files: each change of the format that removes, renames or
// re-interprets a field adds one pure function from version n to n+1
// (docs/data-model.md#export-file). Tests pass their own list to prove the
// mechanism.

import { FORMAT_VERSION } from './types';

export type FormatMigration = (file: Record<string, unknown>) => Record<string, unknown>;

/**
 * Version 1 to 2 made stock per place. Version 3 drops stock from the file, so
 * the step only has to hand the file on.
 */
const stockPerPlace: FormatMigration = (file) => file;

/**
 * Version 2 to 3: stock and the places it was kept in leave the file. Stock
 * belongs to a space now and is kept with the space, not with Mixtura's own
 * data; what an older file holds of it is not imported.
 */
const withoutStock: FormatMigration = (file) => {
  const out = { ...file };
  delete out['places'];
  delete out['stock'];
  return out;
};

/** The shipped migrations; `migrations[n - 1]` upgrades version n to n + 1. */
export const formatMigrations: readonly FormatMigration[] = [stockPerPlace, withoutStock];

/**
 * Upgrades a file of an older version step by step; the version field is set after each step.
 * @param file The parsed file at version `from`.
 * @param from The version of the file.
 * @param to The version wanted; defaults to the current format version.
 * @param list The migrations; defaults to the shipped list (tests pass their own).
 * @returns The file at version `to`; throws when a step is missing.
 */
export function migrateFile(
  file: Record<string, unknown>,
  from: number,
  to: number = FORMAT_VERSION,
  list: readonly FormatMigration[] = formatMigrations,
): Record<string, unknown> {
  let current = file;
  for (let version = from; version < to; version++) {
    const step = list[version - 1];
    if (!step) throw new Error(`No migration from format ${version} to ${version + 1}`);
    current = { ...step(current), formatVersion: version + 1 };
  }
  return current;
}
