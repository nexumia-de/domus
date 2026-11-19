// Keeps the vector files from rotting: every file in vectors/ validates
// against vectors/vector.schema.json and carries a unique id equal to its
// file name. No engine code reads the vectors yet.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { validate } from './helpers/json-schema';

const dir = fileURLToPath(new URL('../vectors/', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(`${dir}${name}`, 'utf8'));
const schema = read('vector.schema.json');
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'vector.schema.json');

test('there are vector files', () => {
  expect(files.length).toBeGreaterThanOrEqual(5);
});

test.each(files)('%s validates against the vector schema', (file) => {
  const vector = read(file);
  expect(validate(schema, vector)).toEqual([]);
  expect(vector.id).toBe(file.replace(/\.json$/, ''));
});

test('the schema rejects a vector without a source', () => {
  const vector = read(files[0] as string);
  delete vector.source;
  expect(validate(schema, vector)).not.toEqual([]);
});

test('dilution.json validates and its defaults lie within their range', () => {
  const dilutionSchema = JSON.parse(readFileSync(`${dir}../data/dilution.schema.json`, 'utf8'));
  const data = JSON.parse(readFileSync(`${dir}../data/dilution.json`, 'utf8'));
  expect(validate(dilutionSchema, data)).toEqual([]);
  for (const m of data.methods) {
    expect(m.fraction_low).toBeLessThanOrEqual(m.fraction_default);
    expect(m.fraction_default).toBeLessThanOrEqual(m.fraction_high);
  }
});
