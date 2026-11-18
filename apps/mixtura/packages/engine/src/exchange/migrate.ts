// Older export files: each change of the format that removes, renames or
// re-interprets a field adds one pure function from version n to n+1
// (docs/data-model.md#export-file). The engine has no ids or clock, so what a
// step needs that the file lacks comes in as `input` from the host. Tests pass
// their own list to prove the mechanism.

import { FORMAT_VERSION, type ExchangePlace } from './types';

/** What the host supplies to migrations: the place that takes the stock of a version 1 file. */
export interface MigrationInput {
  placeForOldStock?: ExchangePlace;
}

export type FormatMigration = (
  file: Record<string, unknown>,
  input: MigrationInput,
) => Record<string, unknown>;

/** A migration needs an input the host did not give. */
export class MissingMigrationInput extends Error {
  constructor(readonly input: keyof MigrationInput) {
    super(`The migration needs the input "${input}"`);
  }
}

/**
 * Version 1 to 2: stock becomes per place. All stock goes into the host's place;
 * its `updatedAt` is the file's export instant, or the place's when the file has none.
 */
const stockPerPlace: FormatMigration = (file, input) => {
  const place = input.placeForOldStock;
  if (!place) throw new MissingMigrationInput('placeForOldStock');
  const at = typeof file['exportedAt'] === 'string' ? file['exportedAt'] : place.updatedAt;
  const stock = Array.isArray(file['stock'])
    ? file['stock'].map((r: object) => ({ placeId: place.id, updatedAt: at, ...r }))
    : file['stock'];
  return { ...file, places: [place], stock };
};

/** The shipped migrations; `migrations[n - 1]` upgrades version n to n + 1. */
export const formatMigrations: readonly FormatMigration[] = [stockPerPlace];

/**
 * Upgrades a file of an older version step by step; the version field is set after each step.
 * @param file The parsed file at version `from`.
 * @param from The version of the file.
 * @param to The version wanted; defaults to the current format version.
 * @param list The migrations; defaults to the shipped list (tests pass their own).
 * @param input What the host supplies to the steps, such as the place for old stock.
 * @returns The file at version `to`; throws when a step is missing.
 */
export function migrateFile(
  file: Record<string, unknown>,
  from: number,
  to: number = FORMAT_VERSION,
  list: readonly FormatMigration[] = formatMigrations,
  input: MigrationInput = {},
): Record<string, unknown> {
  let current = file;
  for (let version = from; version < to; version++) {
    const step = list[version - 1];
    if (!step) throw new Error(`No migration from format ${version} to ${version + 1}`);
    current = { ...step(current, input), formatVersion: version + 1 };
  }
  return current;
}
