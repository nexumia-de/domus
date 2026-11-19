// The shipped classics and the data folders: every dish file meets its schema, lies in the folder
// of its country under its id, passes the engine's rules against the techniques and the catalogue,
// and says which second check it had. With no dish yet the checks run on the fictional example.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { TECHNIQUES, validateClassic } from '@culina/engine';
import type { Classic, Technique } from '@culina/engine';
import { CLASSICS, classicById, classicsOf } from '../src/classics';
import { listWanted, describeWanted } from './classics-wanted';
import { CLASSIC_DIR, jsonFiles } from './content-texts';
import { must } from './must';

const schemaDir = fileURLToPath(new URL('../../engine/schemas/', import.meta.url));
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
  ajv.addSchema(read(schemaDir + file) as object);
}
const classicSchema = must(
  ajv.getSchema('https://nexumia-de.github.io/culina/schemas/classic.schema.json'),
);
const example = read(`${schemaDir}examples/classic.valid.json`) as Classic;
const exampleTechnique = read(`${schemaDir}examples/technique.valid.json`) as Technique;
const catalogue = read(
  fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
) as { ingredients: { id: string }[] };
const catalogueIds = new Set(catalogue.ingredients.map((i) => i.id));

describe('the index of shipped classics', () => {
  const files = jsonFiles(CLASSIC_DIR);

  test('holds one entry per file, in path order, country folder and id agree', () => {
    expect(CLASSICS.map((c) => `${c.country}/${c.id}.json`)).toEqual(
      files.map((f) => f.split('/').slice(-2).join('/')),
    );
  });
  test('only the four country folders exist', () => {
    const dirs = readdirSync(CLASSIC_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(dirs.sort()).toEqual(['de', 'es', 'fr', 'it']);
  });
  test('ids are unique and found by id and by country', () => {
    expect(new Set(CLASSICS.map((c) => c.id)).size).toBe(CLASSICS.length);
    for (const c of CLASSICS) {
      expect(classicById(c.id)).toBe(c);
      expect(classicsOf(c.country)).toContain(c);
    }
    expect(classicById('no-such-dish')).toBeUndefined();
  });
});

describe('every shipped classic', () => {
  // A loop, not test.each: with no dish yet there is nothing to run and that is no failure.
  test('meets the schema and the rules against the techniques and the catalogue', () => {
    for (const classic of CLASSICS) {
      const at = `${classic.country}/${classic.id}`;
      expect(classicSchema(classic), `${at}: ${JSON.stringify(classicSchema.errors)}`).toBe(true);
      const result = validateClassic(classic, {
        techniques: TECHNIQUES,
        ingredientIds: catalogueIds,
      });
      expect(result, `${at}: ${JSON.stringify(result)}`).toEqual({ ok: true });
    }
  });
});

describe('the fictional example stands for a dish file', () => {
  test('it meets the schema and the rules (the catalogue ids are not checked: it is invented)', () => {
    expect(classicSchema(example)).toBe(true);
    expect(validateClassic(example, { techniques: [exampleTechnique] })).toEqual({ ok: true });
  });
});

describe('the wanted lines', () => {
  test('are listed with their classic, place and both names', () => {
    expect(describeWanted(listWanted([example]))).toEqual([
      'example-dish components[0].lines[0] Example fat / Beispielfett',
      'example-dish components[0].lines[2] Example salt / Beispielsalz',
      'example-dish components[0].lines[3] Example spice / Beispielgewürz',
      'example-dish slots[1] Example starch / Beispielstärke',
    ]);
  });
  test('the shipped list belongs to shipped classics (a later package brings it to zero)', () => {
    expect(listWanted().every((w) => classicById(w.classic) !== undefined)).toBe(true);
  });
});
