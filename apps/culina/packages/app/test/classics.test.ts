// The shipped classics and the data folders: every dish file meets its schema, lies in the folder
// of its country under its id, passes the engine's rules against the techniques and the catalogue,
// and says which second check it had. With no dish yet the checks run on the fictional example.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { COUNTRY_CODES, TECHNIQUES, validateClassic } from '@culina/engine';
import type { Classic, Technique } from '@culina/engine';
import { CLASSICS, PACK, classicById, classicsOf } from '../src/classics';
import { listWanted, describeWanted } from './classics-wanted';
import { CLASSIC_DIR, PACK_DIR, jsonFiles } from './content-texts';
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
  test('only folders of the countries the app names exist', () => {
    const dirs = readdirSync(CLASSIC_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(dirs.sort()).toEqual([...COUNTRY_CODES].sort());
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

describe('the classics that are bases (issue 39, part 1; 16 more with the recipes of 2026-11-23, 50 more with the own recipes)', () => {
  const BASES = [
    'achat',
    'alioli',
    'arroz-blanco',
    'arroz-rojo',
    'bai-mi-fan',
    'balsamella',
    'barbecue-sauce',
    'basmati-chawal',
    'bratkartoffeln',
    'bulgur-pilavi',
    'buttermilk-pancakes',
    'cavolfiore-balsamella',
    'chao-cai-jiang',
    'chao-shi-cai',
    'chapati',
    'coban-salatasi',
    'coleslaw',
    'crema-de-limon',
    'creme-caramel',
    'crepes',
    'dan-chao-fan',
    'egg-noodles',
    'eierkuchen',
    'fanqie-chao-dan',
    'flan-clasico',
    'frijoles-refritos',
    'gambas-al-ajillo',
    'gnocchi-di-patate',
    'gnocchi-di-semolino',
    'gohan',
    'guacamole',
    'hamburger-patties',
    'holl-sauce',
    'impasto-per-pizza',
    'kachumber',
    'kartoffelnudeln',
    'khao-suai',
    'kyuri-no-sunomono',
    'ladolemono',
    'macaroni-a-l-italienne-maigre',
    'maccheroni-alla-bolognese',
    'mashed-potatoes',
    'masoor-dal-tadka',
    'mayonnaise',
    'mercimek-corbasi',
    'minestrone',
    'miso-ramen-no-supu',
    'miso-shiru',
    'murgh-masala',
    'nam-chim-kai',
    'nam-chim-satay',
    'napfkuchen',
    'omelette-fines-herbes',
    'onion-gravy',
    'pai-huanggua',
    'passato-di-patate',
    'patatas-bravas',
    'patates-lemonates',
    'pesto-genovese',
    'pico-de-gallo',
    'pollo-deshebrado-en-jitomate',
    'pommes-de-terre-au-lait',
    'pure-de-patatas',
    'quiche-lorraine',
    'rahmchampignons',
    'raita',
    'risotto-alla-milanese',
    'risotto-bianco',
    'roast-potatoes',
    'ruehrei',
    'sake-no-shioyaki',
    'salsa-de-tomate',
    'salsa-di-pomodoro',
    'salsa-vinagreta',
    'sauce-blanche',
    'sauce-hollandaise',
    'sauce-maitre-d-hotel',
    'saure-eiersauce',
    'souvlaki-kotopoulo',
    'spaghetti-alla-rustica',
    'spargelsauce',
    'tagliatelle-verdi',
    'tamagoyaki',
    'teriyaki-no-tare',
    'tortillas-de-harina',
    'tzatziki',
    'vinaigrette-moutarde',
    'yude-tamago',
  ];
  test('are marked as bases, and every component of a base names its role', () => {
    expect(
      CLASSICS.filter((c) => c.kind === 'base')
        .map((c) => c.id)
        .sort(),
    ).toEqual(BASES);
    for (const c of CLASSICS.filter((x) => x.kind === 'base')) {
      for (const comp of c.components ?? []) expect(comp.role, `${c.id}/${comp.id}`).toBeTruthy();
    }
  });
});

describe('the import pack (docs/decisions/bases-and-pack.md)', () => {
  test('holds one entry per file, in path order, country folder and id agree', () => {
    expect(PACK.map((c) => `${c.country}/${c.id}.json`)).toEqual(
      jsonFiles(PACK_DIR).map((f) => f.split('/').slice(-2).join('/')),
    );
  });
  test('only country folders exist', () => {
    const dirs = readdirSync(PACK_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const dir of dirs) expect(['de', 'es', 'fr', 'it']).toContain(dir);
  });
  test('every dish meets the schema and the rules, as a shipped one', () => {
    for (const classic of PACK) {
      const at = `pack ${classic.country}/${classic.id}`;
      expect(classicSchema(classic), `${at}: ${JSON.stringify(classicSchema.errors)}`).toBe(true);
      const result = validateClassic(classic, {
        techniques: TECHNIQUES,
        ingredientIds: catalogueIds,
      });
      expect(result, `${at}: ${JSON.stringify(result)}`).toEqual({ ok: true });
    }
  });
  test('holds no base, and no id is both shipped and in the pack', () => {
    expect(PACK.filter((c) => c.kind === 'base').map((c) => c.id)).toEqual([]);
    const shipped = new Set(CLASSICS.map((c) => c.id));
    expect(PACK.filter((c) => shipped.has(c.id)).map((c) => c.id)).toEqual([]);
    expect(new Set(PACK.map((c) => c.id)).size).toBe(PACK.length);
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

describe('remarks about the source are kept apart from cooking help', () => {
  type Line = { note?: { en: string; de: string }; amount?: unknown; amountWord?: string };
  const lines = (): { at: string; line: Line }[] =>
    CLASSICS.flatMap((c) =>
      (c.components ?? []).flatMap((k) =>
        k.lines.map((line, i) => ({ at: `${c.id}/${k.id}[${i}]`, line: line as Line })),
      ),
    );
  // What only a remark about the source says; none of it belongs in a line or in a step.
  const SOURCE_EN = /\b(source|book|scans?|editions?|OCR|legible|garbled|translation|validator)\b/i;
  const SOURCE_DE = /\b(Quelle|Buch|Scans?|Ausgabe|OCR|lesbar|verstümmelt|Validator)\b/;

  test('the cooking note of a line does not talk about the source', () => {
    for (const { at, line } of lines()) {
      if (line.note === undefined) continue;
      expect(line.note.en, `${at} (en)`).not.toMatch(SOURCE_EN);
      expect(line.note.de, `${at} (de)`).not.toMatch(SOURCE_DE);
      expect(line.note.en, `${at}: the source's wording is not a cooking note`).not.toMatch(
        /^Original:|no (amount|quantity|volume|weight)\b/i,
      );
    }
  });
  test('the text of a step does not talk about the scans or the edition', () => {
    for (const c of CLASSICS)
      for (const k of c.components ?? [])
        for (const [i, step] of (k.steps ?? []).entries()) {
          expect(step.text.en, `${c.id}/${k.id} step ${i + 1}`).not.toMatch(
            /\b(source|scans?|editions?|OCR|legible)\b/i,
          );
          expect(step.text.de, `${c.id}/${k.id} step ${i + 1}`).not.toMatch(
            /\b(Quelle|Scans?|Ausgabe|OCR|lesbar)\b/,
          );
        }
  });
  test('the remarks are kept in the data, in both languages', () => {
    const remarks = lines().filter(({ line }) => 'sourceNote' in (line as object));
    expect(remarks.length).toBeGreaterThan(100);
    const steps = CLASSICS.flatMap((c) => c.components ?? []).flatMap((k) => k.steps ?? []);
    expect(steps.filter((s) => s.sourceNote !== undefined).length).toBeGreaterThanOrEqual(3);
  });
  test('"to taste" and "as needed" are said only where the data says them, and never beside an amount', () => {
    const words = lines().filter(({ line }) => line.amountWord !== undefined);
    expect(words.length).toBeGreaterThan(0);
    for (const { at, line } of words) {
      expect(line.amount, at).toBeUndefined();
      expect(['to-taste', 'as-needed'], at).toContain(line.amountWord);
    }
  });
});
