import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { COUNTRY_CODES, COURSE_IDS } from '../src/index';

const schemaDir = fileURLToPath(new URL('../schemas/', import.meta.url));
const docPath = fileURLToPath(new URL('../../../docs/data-model.md', import.meta.url));

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const schemaFiles = readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'));

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of schemaFiles) ajv.addSchema(read(schemaDir + file) as object);
const idOf = (name: string): string =>
  (read(`${schemaDir}${name}.schema.json`) as { $id: string }).$id;
const validator = (name: string) => {
  const fn = ajv.getSchema(idOf(name));
  if (!fn) throw new Error(`schema ${name} not loaded`);
  return fn;
};
const example = (name: string, kind: 'valid' | 'invalid'): unknown =>
  read(`${schemaDir}examples/${name}.${kind}.json`);
type Doc = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const entities = [
  'ingredient',
  'template',
  'component',
  'dish',
  'stock',
  'affinity',
  'tasting',
  'export',
  'catalogue',
  'technique',
  'handling',
  'substitute',
  'classic',
  'skill',
];

describe('every schema has one valid and one invalid example', () => {
  test.each(entities)('%s', (name) => {
    const validate = validator(name);
    expect(validate(example(name, 'valid')), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(example(name, 'invalid'))).toBe(false);
  });
});

describe('invalid cases named by the issue', () => {
  const fails = (name: string, change: (doc: Doc) => void): boolean => {
    const doc = clone(example(name, 'valid'));
    change(doc);
    return !validator(name)(doc);
  };

  test('missing unit', () => {
    expect(fails('stock', (d: Doc) => delete d.amount.unit)).toBe(true);
    expect(fails('component', (d: Doc) => delete d.lines[3].amount.unit)).toBe(true);
  });
  test('negative or zero amount', () => {
    expect(fails('stock', (d: Doc) => (d.amount.value = -1))).toBe(true);
    expect(fails('stock', (d: Doc) => (d.amount.value = 0))).toBe(true);
    expect(fails('component', (d: Doc) => (d.yield.amount.value = -5))).toBe(true);
  });
  test('unknown state or unit', () => {
    expect(fails('stock', (d: Doc) => (d.state = 'frozen'))).toBe(true);
    expect(fails('component', (d: Doc) => (d.lines[0].state = 'fried'))).toBe(true);
    expect(fails('stock', (d: Doc) => (d.amount.unit = 'pinch'))).toBe(true);
  });
  test('percent is for component lines only', () => {
    expect(fails('stock', (d: Doc) => (d.amount.unit = 'percent'))).toBe(true);
    expect(fails('component', (d: Doc) => (d.yield.amount.unit = 'percent'))).toBe(true);
  });
  test('numbers without a source are refused', () => {
    expect(fails('ingredient', (d: Doc) => delete d.yields[0].source)).toBe(true);
    expect(fails('ingredient', (d: Doc) => delete d.densityGPerMl.source)).toBe(true);
    expect(fails('component', (d: Doc) => delete d.yield.source)).toBe(true);
    expect(fails('template', (d: Doc) => delete d.source)).toBe(true);
  });
  test('ids and dates are checked', () => {
    expect(fails('stock', (d: Doc) => (d.id = 'Not A Slug'))).toBe(true);
    expect(fails('stock', (d: Doc) => (d.useBy = '17.11.2026'))).toBe(true);
    expect(fails('stock', (d: Doc) => (d.useBy = '2026-13-01'))).toBe(true);
  });
  test('no derived value is accepted as a stored field', () => {
    expect(fails('component', (d: Doc) => (d.totalMassG = 1700))).toBe(true);
    expect(fails('component', (d: Doc) => (d.yield.lossPercent = 5))).toBe(true);
    expect(fails('stock', (d: Doc) => (d.daysLeft = 3))).toBe(true);
    expect(fails('tasting', (d: Doc) => (d.dishName = 'Bread'))).toBe(true);
    expect(fails('template', (d: Doc) => (d.parts[0].percent = 100))).toBe(true);
    expect(fails('ingredient', (d: Doc) => (d.level = 2))).toBe(true);
  });
  test('x- fields are allowed, other unknown fields are not', () => {
    expect(fails('stock', (d: Doc) => (d['x-colour'] = 'red'))).toBe(false);
    expect(fails('stock', (d: Doc) => (d.colour = 'red'))).toBe(true);
  });
  test('a template is a root or a derivative, not both', () => {
    const validate = validator('template');
    expect(
      validate({
        id: 'a',
        name: 'A',
        source: 'user',
        parentId: 'b',
        changes: [{ op: 'remove', role: 'fat' }],
      }),
    ).toBe(true);
    expect(
      validate({
        id: 'a',
        name: 'A',
        source: 'user',
        parentId: 'b',
        changes: [{ op: 'swap', role: 'fat', ingredientClass: 'oil' }],
      }),
    ).toBe(true);
    expect(validate({ id: 'a', name: 'A', source: 'user', parentId: 'b' })).toBe(false);
    expect(validate({ id: 'a', name: 'A', source: 'user' })).toBe(false);
    expect(
      validate({
        id: 'a',
        name: 'A',
        source: 'user',
        parentId: 'b',
        changes: [{ op: 'add', role: 'fat' }],
      }),
    ).toBe(false);
  });
  test('tasting notes are records of their own, not a list inside a component or dish', () => {
    const note = { date: '2026-11-18', text: 'Needs salt.' };
    expect(fails('component', (d: Doc) => (d.tastings = [note]))).toBe(true);
    expect(fails('dish', (d: Doc) => (d.tastings = [note]))).toBe(true);
  });
  test('a tasting note points at a component or a dish version', () => {
    expect(fails('tasting', (d: Doc) => (d.ref.kind = 'dish'))).toBe(false);
    expect(fails('tasting', (d: Doc) => (d.ref.kind = 'ingredient'))).toBe(true);
    expect(fails('tasting', (d: Doc) => delete d.ref)).toBe(true);
    expect(fails('tasting', (d: Doc) => (d.ref.id = 'Not A Slug'))).toBe(true);
    expect(fails('tasting', (d: Doc) => (d.date = '18.11.2026'))).toBe(true);
    expect(fails('tasting', (d: Doc) => (d.text = ''))).toBe(true);
    expect(fails('tasting', (d: Doc) => (d['x-mood'] = 'happy'))).toBe(false);
  });
  test('export: only formatVersion 2 is read, entities are checked inside, stock is no part', () => {
    expect(fails('export', (d: Doc) => (d.formatVersion = 1))).toBe(true);
    expect(fails('export', (d: Doc) => (d.stock = []))).toBe(true);
    expect(fails('export', (d: Doc) => (d.ingredients[0].name = ''))).toBe(true);
    expect(fails('export', (d: Doc) => (d.tastings[0].ref.kind = 'stock'))).toBe(true);
  });
  test('ingredient names: language tag keys, a name and a source each, no unknown field', () => {
    expect(fails('ingredient', (d: Doc) => (d.names.de.aliases = ['Zwiebel', 'Zwiebel']))).toBe(
      true,
    );
    expect(fails('ingredient', (d: Doc) => delete d.names.de.source)).toBe(true);
    expect(fails('ingredient', (d: Doc) => delete d.names.de.name)).toBe(true);
    expect(fails('ingredient', (d: Doc) => (d.names.de.note = 'x'))).toBe(true);
    expect(fails('ingredient', (d: Doc) => (d.names.German = d.names.de))).toBe(true);
    expect(fails('ingredient', (d: Doc) => (d.names['pt-BR'] = d.names.de))).toBe(false);
    expect(fails('ingredient', (d: Doc) => delete d.names)).toBe(false);
  });
  test('catalogue: format 1 only, entries are ingredient records with sourced numbers', () => {
    expect(fails('catalogue', (d: Doc) => (d.formatVersion = 2))).toBe(true);
    expect(fails('catalogue', (d: Doc) => delete d.dataset.sha256)).toBe(true);
    expect(fails('catalogue', (d: Doc) => delete d.ingredients[0].densityGPerMl.source)).toBe(true);
    expect(fails('catalogue', (d: Doc) => (d.ingredients[0].id = 'Not A Slug'))).toBe(true);
    expect(fails('catalogue', (d: Doc) => (d.ingredients[0]['x-fdc'] = { id: 1 }))).toBe(false);
  });
  test('a dish states a course and a cuisine of the lists a classic uses, or none', () => {
    expect(fails('dish', (d: Doc) => delete d.course)).toBe(false);
    expect(fails('dish', (d: Doc) => (d.cuisine = 'it'))).toBe(false);
    expect(fails('dish', (d: Doc) => (d.course = 'brunch'))).toBe(true);
    expect(fails('dish', (d: Doc) => (d.course = ''))).toBe(true);
    expect(fails('dish', (d: Doc) => (d.cuisine = 'jp'))).toBe(true);
    expect(fails('dish', (d: Doc) => (d.cuisine = 'IT'))).toBe(true);
  });
  test('the course and country lists of the engine equal the schema', () => {
    const common = read(`${schemaDir}common.schema.json`) as {
      $defs: { course: { enum: string[] }; country: { enum: string[] } };
    };
    expect([...COURSE_IDS]).toEqual(common.$defs.course.enum);
    expect([...COUNTRY_CODES]).toEqual(common.$defs.country.enum);
  });
});

describe('data-model.md and the schemas agree', () => {
  const doc = readFileSync(docPath, 'utf8');
  const heading: Record<string, string> = {
    ingredient: 'Ingredient',
    template: 'Ratio template',
    component: 'Component',
    dish: 'Dish',
    stock: 'Stock item',
    affinity: 'Affinity',
    tasting: 'Tasting note',
    export: 'Export file',
    catalogue: 'Ingredient catalogue file',
    technique: 'Technique',
    handling: 'Handling rule',
    substitute: 'Substitute effect',
    classic: 'Classic',
    skill: 'Skill state',
  };
  const table = (title: string): Map<string, boolean> => {
    const start = doc.indexOf(`\n## ${title}\n`);
    expect(start, `section ${title}`).toBeGreaterThan(-1);
    const rows = new Map<string, boolean>();
    for (const line of doc
      .slice(start + 1)
      .split('\n')
      .slice(1)) {
      if (/^#{1,2} /.test(line)) break;
      const cells = line.split('|').map((c) => c.trim());
      const match = /^`([^`]+)`$/.exec(cells[1] ?? '');
      if (match?.[1] && cells[3]) rows.set(match[1], cells[3] === 'yes');
    }
    return rows;
  };

  test.each(entities)('%s fields and required flags', (name) => {
    const schema = read(`${schemaDir}${name}.schema.json`) as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const rows = table(heading[name] as string);
    expect([...rows.keys()].sort()).toEqual(Object.keys(schema.properties).sort());
    for (const [field, required] of rows) {
      expect(schema.required.includes(field), `${name}.${field} required`).toBe(required);
    }
  });
});
