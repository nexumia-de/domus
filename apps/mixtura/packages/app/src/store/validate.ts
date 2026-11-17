// Validates entities against the JSON Schemas of packages/engine/schemas
// (docs/data-model.md) before every write. Ajv is compiled lazily, once.

import Ajv2020 from 'ajv/dist/2020.js';
import affinity from '../../../engine/schemas/affinity.schema.json';
import exportSchema from '../../../engine/schemas/export.schema.json';
import common from '../../../engine/schemas/common.schema.json';
import ingredient from '../../../engine/schemas/ingredient.schema.json';
import prepared from '../../../engine/schemas/prepared-ingredient.schema.json';
import spec from '../../../engine/schemas/spec.schema.json';
import stock from '../../../engine/schemas/stock.schema.json';
import template from '../../../engine/schemas/template.schema.json';
import { StoreError } from './errors';
import type { EntityKind } from './types';

const ids: Record<EntityKind, string> = {
  ingredient: 'urn:mixtura:ingredient',
  template: 'urn:mixtura:template',
  spec: 'urn:mixtura:spec',
  stock: 'urn:mixtura:stock',
  affinity: 'urn:mixtura:affinity',
};
const exportId = 'urn:mixtura:export';

let ajv: InstanceType<typeof Ajv2020> | undefined;

function validator(
  kind: EntityKind | 'export',
): ReturnType<InstanceType<typeof Ajv2020>['getSchema']> {
  if (!ajv) {
    ajv = new Ajv2020({ allErrors: true, strict: true });
    for (const schema of [
      common,
      prepared,
      ingredient,
      template,
      spec,
      stock,
      affinity,
      exportSchema,
    ]) {
      ajv.addSchema(schema);
    }
  }
  return ajv.getSchema(kind === 'export' ? exportId : ids[kind]);
}

/** Throws a StoreError of kind `invalid` that lists every problem. */
export function validateEntity(kind: EntityKind, value: unknown): void {
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
