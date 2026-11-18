import type { Migration } from '../types';

/**
 * The real migrations, in order: `{ from: n, to: n + 1, migrate }`, pure functions over plain
 * rows. The schema is at version 1, so there are none yet; the runner is proven with test-only
 * migrations passed to `openStore({ migrations })`. The schema version is 1 + the number of
 * migrations. Each migration gets a before and after fixture in `test/fixtures/store/`.
 */
export const MIGRATIONS: readonly Migration[] = [];

export const schemaVersionOf = (migrations: readonly Migration[]): number => 1 + migrations.length;
