// Shipped substitutes: the files in data/substitutes/, the schema examples and what the schema
// refuses. The rules against the catalogue are in the app's tests, which know the catalogue.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  SUBSTITUTES,
  substituteById,
  substituteEffects,
  validateSubstitute,
  validateSubstitutes,
} from '../src/index';
import type { Substitute } from '../src/index';
import { contentValidators as schema } from './validators';

const dataDir = fileURLToPath(new URL('../data/substitutes/', import.meta.url));
const example = (name: string): Substitute =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.json`, import.meta.url)),
      'utf8',
    ),
  ) as Substitute;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Doc = any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('shipped substitutes', () => {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  test('the index holds one entry per file, in file name order', () => {
    expect(SUBSTITUTES.map((s) => `${s.id}.json`)).toEqual([...files].sort());
  });
  test('every file meets the schema, its file name is its id and the engine rules hold', () => {
    for (const file of files) {
      const doc = JSON.parse(readFileSync(dataDir + file, 'utf8')) as Substitute;
      expect(schema.substitute(doc), `${file}: ${JSON.stringify(schema.substitute.errors)}`).toBe(
        true,
      );
      expect(`${doc.id}.json`).toBe(file);
      expect(validateSubstitute(doc)).toEqual({ ok: true });
    }
  });
  test('no id twice, the lookup by id finds each,', () => {
    expect(validateSubstitutes(SUBSTITUTES)).toEqual({ ok: true });
    for (const s of SUBSTITUTES) expect(substituteById(s.id)).toBe(s);
    expect(substituteById('not-a-substitute')).toBeUndefined();
  });
  test('the lookup finds a shipped substitute for an ingredient below its group', () => {
    const tree = [{ id: 'g' }, { id: 'leaf', parentId: 'g' }];
    const list = [{ ...example('substitute.valid'), from: 'g', to: 'x' }];
    expect(substituteEffects('leaf', tree, list)).toEqual(list);
  });
});

describe('the substitute example', () => {
  test('passes the engine rules and, with its two ingredients, the catalogue check', () => {
    const valid = example('substitute.valid');
    expect(validateSubstitute(valid)).toEqual({ ok: true });
    const ids = new Set([valid.from, valid.to]);
    expect(validateSubstitute(valid, { ingredientIds: ids })).toEqual({ ok: true });
    expect(validateSubstitute(valid, { ingredientIds: new Set([valid.from]) })).toMatchObject({
      ok: false,
    });
  });
});

describe('what the substitute schema refuses', () => {
  const fails = (change: (d: Doc) => void) => {
    const doc = clone(example('substitute.valid')) as Doc;
    change(doc);
    return !schema.substitute(doc);
  };
  test('a text needs both languages, a level from the list and a source with a sentence', () => {
    expect(fails((d) => delete d.changes.de)).toBe(true);
    expect(fails((d) => (d.level = 'folklore'))).toBe(true);
    expect(fails((d) => (d.sources = []))).toBe(true);
    expect(fails((d) => delete d.sources[0].sentence)).toBe(true);
    expect(fails((d) => delete d.sources[0].licence)).toBe(false);
  });
  test('from and to are required, a factor is optional and positive', () => {
    expect(fails((d) => delete d.from)).toBe(true);
    expect(fails((d) => delete d.to)).toBe(true);
    expect(fails((d) => delete d.factor)).toBe(false);
    expect(fails((d) => (d.factor = 0))).toBe(true);
    expect(fails((d) => (d.factor = -1))).toBe(true);
    expect(fails((d) => (d.unknown = 1))).toBe(true);
  });
});
