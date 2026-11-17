// Older export files: each change of the format that removes, renames or
// re-interprets a field adds one pure function from version n to n+1
// (docs/data-model.md#export-file). Version 1 is the first, so the list is
// empty; tests pass their own list to prove the mechanism.

import { FORMAT_VERSION } from './format';

export type FormatMigration = (file: Record<string, unknown>) => Record<string, unknown>;

/** `migrations[n - 1]` upgrades version n to n + 1. */
export const formatMigrations: readonly FormatMigration[] = [];

/** Upgrades a file of an older version step by step; the version field is set after each step. */
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
