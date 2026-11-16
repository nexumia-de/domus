// The valid example files must pass their schema; the invalid ones must
// fail with the message named below. A file is named <schema>-<what>.json.
import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { makeAjv, readJson, schemaNames, schemasDir } from './schema-helpers';

const ajv = makeAjv();
const schemaOf = (file: string) => {
  const name = schemaNames.find((n) => file.startsWith(`${n}-`));
  if (!name) throw new Error(`${file} does not start with a schema name`);
  return name;
};
const validate = (file: string, dir: string) => {
  const check = ajv.getSchema(`urn:mixtura:${schemaOf(file)}`);
  if (!check) throw new Error(`no schema for ${file}`);
  const ok = check(readJson(`${schemasDir}examples/${dir}/${file}`));
  return { ok, text: ajv.errorsText(check.errors, { separator: '; ' }) };
};
const files = (dir: string) => readdirSync(`${schemasDir}examples/${dir}`).sort();

describe('valid examples', () => {
  test('there are at least two', () => {
    expect(files('valid').length).toBeGreaterThanOrEqual(2);
  });
  test.each(files('valid'))('%s passes', (file) => {
    const r = validate(file, 'valid');
    expect(r.text).toBe('No errors');
    expect(r.ok).toBe(true);
  });
});

const expected: Record<string, string> = {
  'export-future-version.json': 'formatVersion must be equal to constant',
  'spec-missing-unit.json': "must have required property 'unit'",
  'ingredient-prepared-with-abv.json': 'data/abv boolean schema is false',
  'ingredient-abv-fraction-name.json': '/abv must be <= 100',
  'affinity-same-twice.json': 'must NOT have duplicate items',
  'template-ranges-without-source.json': 'must have property source when property usual is present',
};

describe('invalid examples', () => {
  test('there are at least two and each has an expectation', () => {
    expect(files('invalid').length).toBeGreaterThanOrEqual(2);
    expect(files('invalid')).toEqual(Object.keys(expected).sort());
  });
  test.each(Object.entries(expected))('%s fails with a useful message', (file, message) => {
    const r = validate(file, 'invalid');
    expect(r.ok).toBe(false);
    expect(r.text).toContain(message);
  });
  test('an id with a space is named in the message', () => {
    expect(validate('ingredient-abv-fraction-name.json', 'invalid').text).toContain(
      '/id must match pattern',
    );
  });
});
