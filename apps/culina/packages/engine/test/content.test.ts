// Shipped content: the techniques in data/techniques/, the schema examples of a technique, a classic
// and skill state, and the rules the schemas cannot state.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  TECHNIQUES,
  copyClassic,
  deriveClassic,
  learnedTechniques,
  skillRecord,
  techniqueById,
  validateClassic,
  validateSteps,
  validateTechnique,
  validateTechniques,
} from '../src/index';
import type { Classic, Technique } from '../src/index';
import { contentValidators as schema } from './validators';

const dataDir = fileURLToPath(new URL('../data/techniques/', import.meta.url));
const example = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.json`, import.meta.url)),
      'utf8',
    ),
  ) as T;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Doc = any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('shipped techniques', () => {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  test('the index holds one entry per file, in file name order', () => {
    expect(TECHNIQUES.map((t) => `${t.id}.json`)).toEqual([...files].sort());
  });
  test('every file meets the schema, its file name is its id and the engine rules hold', () => {
    // A loop, not test.each: with no technique yet there is nothing to run and that is no failure.
    for (const file of files) {
      const doc = JSON.parse(readFileSync(dataDir + file, 'utf8')) as Technique;
      expect(schema.technique(doc), `${file}: ${JSON.stringify(schema.technique.errors)}`).toBe(
        true,
      );
      expect(`${doc.id}.json`).toBe(file);
      expect(validateTechnique(doc)).toEqual({ ok: true });
    }
  });
  test('no id twice and the lookup finds each', () => {
    expect(validateTechniques(TECHNIQUES)).toEqual({ ok: true });
    for (const t of TECHNIQUES) expect(techniqueById(t.id)).toBe(t);
    expect(techniqueById('not-a-technique')).toBeUndefined();
  });
});

describe('the schema examples', () => {
  const technique = example<Technique>('technique.valid');
  const classic = example<Classic>('classic.valid');

  test('the technique example passes the engine rules', () => {
    expect(validateTechnique(technique)).toEqual({ ok: true });
  });
  test('the classic example passes the engine rules with the example technique', () => {
    expect(validateClassic(classic, { techniques: [technique] })).toEqual({ ok: true });
  });
  test('the classic example derives: 4 persons to 2 portions halves every amount', () => {
    const got = deriveClassic(classic, { lang: 'en' });
    if (!got.ok) throw new Error(got.error.code);
    const sauce = got.components[0];
    expect(sauce?.lines[0]?.amount).toEqual({ value: 100, unit: 'g' });
    expect(sauce?.lines[1]?.amount).toEqual({ value: 137.5, unit: 'ml' });
    expect(sauce?.lines[2]?.amount).toBeUndefined();
    expect(got.unmeasured).toEqual([{ componentId: 'example-sauce', index: 2 }, { index: 0 }]);
  });
  test('the classic example has wanted lines and so cannot be copied yet', () => {
    const got = copyClassic(classic, { lang: 'en', date: '2026-11-19', newId: () => 'x' });
    expect(got).toEqual({
      ok: false,
      error: {
        code: 'wanted-ingredient',
        wanted: ['Example fat', 'Example salt', 'Example spice', 'Example starch'],
      },
    });
  });
  test('the component example with steps meets the schema and its steps the rules', () => {
    const component = example<{ lines: { key?: string }[]; steps: unknown[] }>(
      'component-steps.valid',
    );
    expect(schema.component(component), JSON.stringify(schema.component.errors)).toBe(true);
    expect(
      validateSteps(
        component as Parameters<typeof validateSteps>[0],
        new Set(['example-technique']),
      ),
    ).toEqual({ ok: true });
    expect(validateSteps(component as Parameters<typeof validateSteps>[0], new Set()).ok).toBe(
      false,
    );
  });
});

describe('what the schemas refuse', () => {
  const fails = (
    name: 'technique' | 'classic' | 'skill' | 'component',
    file: string,
    change: (d: Doc) => void,
  ) => {
    const doc = clone(example<Doc>(file));
    change(doc);
    return !schema[name](doc);
  };
  const classic = 'classic.valid';

  test('texts need both languages', () => {
    expect(fails('technique', 'technique.valid', (d) => delete d.watch.de)).toBe(true);
    expect(fails('classic', classic, (d) => delete d.name.en)).toBe(true);
    expect(fails('classic', classic, (d) => (d.components[0].steps[0].text.de = ''))).toBe(true);
    expect(fails('classic', classic, (d) => (d.components[0].lines[0].wanted.fr = 'x'))).toBe(true);
  });
  test('a technique has a level from the list, a source, and a sentence per source', () => {
    expect(fails('technique', 'technique.valid', (d) => (d.level = 'folklore'))).toBe(true);
    expect(fails('technique', 'technique.valid', (d) => (d.sources = []))).toBe(true);
    expect(fails('technique', 'technique.valid', (d) => delete d.sources[0].sentence)).toBe(true);
    expect(fails('technique', 'technique.valid', (d) => (d.sources[0].url = 'not a url'))).toBe(
      true,
    );
    expect(fails('technique', 'technique.valid', (d) => delete d.sources[0].licence)).toBe(false);
  });
  test('a source is a page with a url or a book with the ISBN of the edition read', () => {
    const book = (d: Doc) => {
      delete d.sources[0].url;
      delete d.sources[0].licence;
      d.sources[0].isbn = '9780000000002';
    };
    expect(fails('technique', 'technique.valid', book)).toBe(false);
    expect(fails('technique', 'technique.valid', (d) => delete d.sources[0].url)).toBe(true);
    expect(
      fails('technique', 'technique.valid', (d) => {
        book(d);
        d.sources[0].isbn = '978-0-00-000000-2';
      }),
    ).toBe(true);
  });
  test('a source may say how it knows it, with a level from the list', () => {
    expect(fails('technique', 'technique.valid', (d) => (d.sources[0].level = 'tested'))).toBe(
      false,
    );
    expect(fails('technique', 'technique.valid', (d) => (d.sources[0].level = 'folklore'))).toBe(
      true,
    );
  });
  test('a line names a catalogue ingredient or a wanted name, not both and not neither', () => {
    const line = (d: Doc) => d.components[0].lines[1];
    expect(fails('classic', classic, (d) => (line(d).wanted = { en: 'x', de: 'y' }))).toBe(true);
    expect(fails('classic', classic, (d) => delete line(d).ref)).toBe(true);
    expect(fails('classic', classic, (d) => delete d.slots[1].wanted)).toBe(true);
  });
  test('amounts: a number or a range, a unit word, a positive value, no unknown field', () => {
    const amount = (d: Doc) => d.components[0].lines[1].amount;
    expect(fails('classic', classic, (d) => (amount(d).value = 0))).toBe(true);
    expect(fails('classic', classic, (d) => (amount(d).unit = ''))).toBe(true);
    expect(fails('classic', classic, (d) => delete amount(d).unit)).toBe(true);
    expect(fails('classic', classic, (d) => (amount(d).percent = 5))).toBe(true);
    expect(fails('classic', classic, (d) => (amount(d).unit = 'Pfund'))).toBe(false);
  });
  test('country, course, persons, settled and check are closed lists and shapes', () => {
    expect(fails('classic', classic, (d) => (d.country = 'uk'))).toBe(true);
    expect(fails('classic', classic, (d) => (d.course = 'brunch'))).toBe(true);
    expect(fails('classic', classic, (d) => (d.persons.basis = 'guessed'))).toBe(true);
    expect(fails('classic', classic, (d) => (d.persons.value = 0))).toBe(true);
    expect(fails('classic', classic, (d) => delete d.check)).toBe(true);
    expect(fails('classic', classic, (d) => (d.check.method = 'looked-again'))).toBe(true);
    expect(fails('classic', classic, (d) => delete d.settled[0].reason)).toBe(true);
    expect(fails('classic', classic, (d) => (d.settled[0].target = 'Not/A Slug'))).toBe(true);
    expect(fails('classic', classic, (d) => (d.components[0].lines[3].settled = false))).toBe(true);
    expect(fails('classic', classic, (d) => (d.units['Example-measure'].kind = 'weight'))).toBe(
      true,
    );
    expect(fails('classic', classic, (d) => delete d.units['Example-measure'].read)).toBe(true);
  });
  test('a classic carries no derived or stored field', () => {
    expect(
      fails('classic', classic, (d) => (d.version = { family: 'a', date: '2026-11-19' })),
    ).toBe(true);
    expect(fails('classic', classic, (d) => (d.portions = 2))).toBe(true);
    expect(fails('classic', classic, (d) => (d.components[0].yield = 1))).toBe(true);
  });
  test('steps: bilingual text, a technique id, unique line keys, time and temperature', () => {
    const c = 'component-steps.valid';
    expect(fails('component', c, (d) => (d.steps[0].technique = 'Not A Slug'))).toBe(true);
    expect(fails('component', c, (d) => (d.steps[0].uses = ['fat', 'fat']))).toBe(true);
    expect(fails('component', c, (d) => (d.steps[0].uses = []))).toBe(true);
    expect(fails('component', c, (d) => (d.lines[0].key = 'Fat'))).toBe(true);
    expect(fails('component', c, (d) => (d.steps[0].time.unit = 'weeks'))).toBe(true);
    expect(fails('component', c, (d) => (d.steps[0].time.value = 0))).toBe(true);
    expect(fails('component', c, (d) => (d.steps[1].temperature.unit = 'K'))).toBe(true);
    expect(fails('component', c, (d) => (d.steps[0].text = 'Melt.'))).toBe(true);
    expect(fails('component', c, (d) => delete d.method)).toBe(false);
  });
  test('skill state: skill- plus a technique id, learned a boolean', () => {
    expect(fails('skill', 'skill.valid', (d) => (d.id = 'melting'))).toBe(true);
    expect(fails('skill', 'skill.valid', (d) => (d.learned = 1))).toBe(true);
    expect(fails('skill', 'skill.valid', (d) => delete d.technique)).toBe(true);
    expect(fails('skill', 'skill.valid', (d) => (d.technique = 'a'.repeat(75)))).toBe(true);
    expect(schema.skill(skillRecord('melting', false))).toBe(true);
    expect(schema.skill(skillRecord('a'.repeat(74), true))).toBe(true);
  });
  test('learned techniques come from the records', () => {
    expect([
      ...learnedTechniques([skillRecord('melting', true), skillRecord('folding', false)]),
    ]).toEqual(['melting']);
  });
});
