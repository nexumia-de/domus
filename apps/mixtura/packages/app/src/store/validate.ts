// Validates entities against the JSON Schemas of packages/engine/schemas
// (docs/data-model.md) before every write. The validators are compiled at
// build time (compile-schemas.mjs): nothing is generated at run time.

import { validators, type Validator } from './schema-validators.generated.mjs';
import { StoreError } from './errors';
import type { DeviceKind, EntityKind } from './types';

function validator(kind: EntityKind | DeviceKind | 'export'): Validator | undefined {
  return validators[kind];
}

/** Throws a StoreError of kind `invalid` that lists every problem. */
export function validateEntity(kind: EntityKind | DeviceKind, value: unknown): void {
  const check = validator(kind);
  if (!check) throw new StoreError('failed', `No schema for ${kind}`);
  if (check(value)) return;
  const details = (check.errors ?? []).map(
    (e) => `${e.instancePath || '(record)'} ${e.message ?? 'is invalid'}`,
  );
  throw new StoreError('invalid', `The ${kind} does not match its schema`, details);
}

/** Problems of a whole export file against the current schema, one line each, at most `limit`. */
export function exportProblems(value: unknown, limit = 20): string[] {
  const check = validator('export');
  if (!check) throw new StoreError('failed', 'No schema for the export file');
  if (check(value)) return [];
  const lines = (check.errors ?? []).map(
    (e) => `${e.instancePath || '(file)'} ${e.message ?? 'is invalid'}`,
  );
  const more = lines.length - limit;
  return more > 0 ? [...lines.slice(0, limit), `and ${more} more problems`] : lines;
}
