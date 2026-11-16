// Loads the JSON Schemas of packages/engine/schemas into one Ajv instance.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

export const schemasDir = fileURLToPath(new URL('../schemas/', import.meta.url));

export type Schema = Record<string, unknown>;

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export const schemaNames = readdirSync(schemasDir)
  .filter((f) => f.endsWith('.schema.json'))
  .map((f) => f.replace('.schema.json', ''))
  .sort();

export const schemas: Record<string, Schema> = Object.fromEntries(
  schemaNames.map((n) => [n, readJson(`${schemasDir}${n}.schema.json`) as Schema]),
);

export function makeAjv(): InstanceType<typeof Ajv2020> {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const name of schemaNames) ajv.addSchema(schemas[name] as Schema);
  return ajv;
}
