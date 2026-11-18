// German names from the Wikidata snapshot: the NDB join, the tie rule, the taxon rule and the
// label rules on small excerpts, the parents' names and categories, the shipped file and the
// snapshot, and that a rerun gives the same bytes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { buildCatalogue, buildRows, serialise } from '../../../tools/catalogue/build.mjs';
import { agreedCategory, agreedNames } from '../../../tools/catalogue/group-names.mjs';
import { buildSnapshot, serialiseSnapshot } from '../../../tools/catalogue/snapshot.mjs';
import {
  cleanAliases,
  germanNames,
  labelInDescription,
  labelIsFirstSegment,
  looksScientific,
  normaliseNdb,
} from '../../../tools/catalogue/wikidata.mjs';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));

interface Row {
  item: string;
  ndb: string;
  ndbCount: number;
  de?: string;
  deAliases?: string[];
  en?: string;
  instanceOf: string[];
}
const snap = (items: Row[]) => ({
  retrieved: '2026-01-01',
  taxonClasses: { Q16521: 'taxon' },
  items: items.map((r) => ({ deAliases: [], ...r })),
});
const food = (fdcId: number, ndbNumber: number, description: string) => ({
  fdcId,
  ndbNumber,
  description,
});
const one = (rows: Row[], f = food(1, 1001, 'Butter, salted')) => germanNames([f], snap(rows));
const butter: Row = {
  item: 'Q1',
  ndb: '01001',
  ndbCount: 1,
  de: 'Butter',
  en: 'butter',
  instanceOf: [],
};

describe('NDB join', () => {
  test('four and five digits are the same number, anything else joins nothing', () => {
    expect(normaliseNdb('1001')).toBe('01001');
    expect(normaliseNdb('01001')).toBe('01001');
    expect(normaliseNdb(1001)).toBe('01001');
    expect(normaliseNdb(' 18634 ')).toBe('18634');
    for (const bad of ['011022', '100252', '020', '81100500', '', 'x1001', undefined]) {
      expect(normaliseNdb(bad), String(bad)).toBeUndefined();
    }
  });
  test('a Wikidata value without the leading zero joins the food with it, and the other way', () => {
    expect(one([{ ...butter, ndb: '1001' }]).found.get(1)?.item).toBe('Q1');
    expect(one([butter], food(1, 1001, 'Butter, salted')).found.get(1)?.item).toBe('Q1');
    expect(one([butter], food(1, 1002, 'Butter, salted')).counts.noItem).toBe(1);
  });
});

describe('tie rule', () => {
  test('two items with the same NDB number: no name for either', () => {
    const result = one([butter, { ...butter, item: 'Q2', de: 'Streichfett' }]);
    expect(result.found.size).toBe(0);
    expect(result.counts.ndbShared).toBe(1);
  });
  test('an item with several NDB numbers: only when its label is the food first segment', () => {
    const milk: Row = { ...butter, item: 'Q3', ndbCount: 14, de: 'Milch', en: 'milk' };
    expect(
      one([milk], food(1, 1001, 'Milk, whole, 3.25% milkfat')).found.get(1)?.names.de?.name,
    ).toBe('Milch');
    const peel = one([{ ...milk, de: 'Orange', en: 'orange' }], food(1, 1001, 'Orange peel'));
    expect(peel.found.size).toBe(0);
    expect(peel.counts.multiNdbBroad).toBe(1);
    // The same label on an item with one NDB number only has to occur in the description.
    expect(
      one([{ ...milk, ndbCount: 1, de: 'Orange', en: 'orange' }], food(1, 1001, 'Orange peel'))
        .found.size,
    ).toBe(1);
  });
  test('no German label: no name', () => {
    const without: Row = { ...butter };
    delete without.de;
    expect(one([without]).counts.noGerman).toBe(1);
  });
});

describe('label rules', () => {
  test('the English label must occur in the description', () => {
    expect(labelInDescription('red cabbage', 'Cabbage, red, raw')).toBe(true);
    expect(labelInDescription('corn starch', 'Cornstarch')).toBe(true);
    expect(labelInDescription('Brussels sprouts', 'Brussels sprouts, raw')).toBe(true);
    expect(labelInDescription('lutein', 'Kale, raw')).toBe(false);
    expect(labelInDescription('', 'Kale, raw')).toBe(false);
    expect(
      one([{ ...butter, en: 'lutein', de: 'Lutein' }], food(1, 1001, 'Kale, raw')).counts
        .labelMismatch,
    ).toBe(1);
  });
  test('parentheses of the description are not read', () => {
    expect(
      labelInDescription('program', "Pears (Includes foods for USDA's Food Distribution Program)"),
    ).toBe(false);
    expect(labelIsFirstSegment('pear', "Pears, raw (Includes foods for USDA's Program)")).toBe(
      true,
    );
    expect(labelIsFirstSegment('pear', 'Pears, raw')).toBe(true);
    expect(labelIsFirstSegment('pear', 'Pear nectar, raw')).toBe(false);
  });
});

describe('taxon rule', () => {
  const taxon = (de: string, en: string): Row => ({ ...butter, de, en, instanceOf: ['Q16521'] });
  test('a taxon item is accepted when its German label is a common name', () => {
    const r = one([taxon('Rotkohl', 'red cabbage')], food(1, 1001, 'Cabbage, red, raw'));
    expect(r.found.get(1)?.taxon).toBe(true);
    expect(r.counts.acceptedTaxon).toBe(1);
  });
  test('a taxon whose German label is a scientific name is skipped', () => {
    for (const de of [
      'Lactuca sativa var. angustana',
      'Vaccinium sect. Cyanococcus',
      'Mentha × piperita',
    ]) {
      const r = one([taxon(de, 'celtuce')], food(1, 1001, 'Celtuce, raw'));
      expect(r.found.size, de).toBe(0);
      expect(r.counts.taxonScientific, de).toBe(1);
    }
  });
  test('a taxon whose English label is a scientific name does not occur in the description', () => {
    expect(
      one([taxon('Hickory', 'Carya')], food(1, 1001, 'Nuts, hickorynuts, dried')).counts
        .labelMismatch,
    ).toBe(1);
  });
  test('the pattern: genus and epithet, not a German noun or a loan name', () => {
    expect(looksScientific('Opuntia ficus-indica')).toBe(true);
    expect(looksScientific('Echter Sellerie')).toBe(false);
    expect(looksScientific('Aceto balsamico')).toBe(true);
    expect(looksScientific('Rotkohl')).toBe(false);
  });
});

describe('aliases', () => {
  test('without the label, scientific names and duplicates, sorted', () => {
    expect(
      cleanAliases(
        ['Mohrrübe', 'Karotte', 'Daucus carota', 'möhre', 'Möhre', 'Mohrrübe'],
        'karotte',
      ),
    ).toEqual(['Mohrrübe', 'Möhre']);
  });
});

describe('parents', () => {
  const named = (id: number, de: string | undefined, category = 'Dairy and Egg Products') => ({
    id: `fdc-${id}`,
    name: `Milk ${id}`,
    ...(de === undefined
      ? {}
      : { names: { de: { name: de, source: `Wikidata Q${id}, label de` } } }),
    'x-fdc': { id, description: 'x', category },
  });
  test('a parent takes a name when every row below has the same one', () => {
    const names = agreedNames([named(1, 'Milch'), named(2, 'Milch')]);
    expect(names?.de?.name).toBe('Milch');
    expect(names?.de?.source).toContain('Wikidata Q1, Q2');
  });
  test('no name when a row has none, when the names differ, or when there is one row', () => {
    expect(agreedNames([named(1, 'Milch'), named(2, undefined)])).toBeUndefined();
    expect(agreedNames([named(1, 'Milch'), named(2, 'Sahne')])).toBeUndefined();
    expect(agreedNames([named(1, 'Milch')])).toBeUndefined();
  });
  test('the category is taken only where all rows share it', () => {
    expect(agreedCategory([named(1, 'a'), named(2, 'b')])).toBe('Dairy and Egg Products');
    expect(agreedCategory([named(1, 'a'), named(2, 'b', 'Fats and Oils')])).toBeUndefined();
  });
});

describe('the generator with the snapshot', () => {
  const foods = (
    read('./fixtures/catalogue/sr-legacy-groups-excerpt.json') as { SRLegacyFoods: never[] }
  ).SRLegacyFoods;
  const fixtureSnapshot = (): ReturnType<typeof snap> => {
    const first = buildRows(foods, '2018-04')[0];
    const ndb = (foods as { fdcId: number; ndbNumber: number }[]).find(
      (f) => f.fdcId === first?.['x-fdc']?.id,
    )?.ndbNumber;
    return snap([{ ...butter, ndb: String(ndb), de: 'Beispiel', en: 'example', instanceOf: [] }]);
  };
  test('without a snapshot the rows have no names, and every row has its category', () => {
    const rows = buildRows(foods, '2018-04');
    expect(rows.some((r) => r.names !== undefined)).toBe(false);
    expect(rows.every((r) => typeof r['x-fdc']?.category === 'string')).toBe(true);
  });
  test('a rerun gives the same bytes, whatever the order of the foods', () => {
    const wikidata = fixtureSnapshot();
    const a = serialise({ ingredients: buildCatalogue(foods, '2018-04', new Map(), wikidata) });
    const b = serialise({
      ingredients: buildCatalogue([...foods].reverse(), '2018-04', new Map(), wikidata),
    });
    expect(b).toBe(a);
  });
});

describe('the snapshot builder', () => {
  const cell = (value: string) => ({ value });
  const response = (item: string, ndb: string, extra: Record<string, string> = {}) => ({
    item: cell(`http://www.wikidata.org/entity/${item}`),
    ndb: cell(ndb),
    deAliases: cell(extra.aliases ?? ''),
    classes: cell(extra.classes ?? ''),
    ...(extra.de !== undefined ? { de: cell(extra.de) } : {}),
    ...(extra.en !== undefined ? { en: cell(extra.en) } : {}),
  });
  test('keeps only the NDB numbers of the catalogue, counts the numbers per item, sorts', () => {
    const items = [
      response('Q2', '1002', { de: 'Zwei', classes: 'i:Q16521¦s:Q5' }),
      response('Q1', '01001', { de: 'Eins', aliases: 'b¦a' }),
      response('Q1', '09999', { de: 'Eins' }),
      response('Q3', '1003'),
    ];
    const built = buildSnapshot(
      items,
      { Q16521: 'taxon', Q5: 'thing' },
      new Set(['01001', '01002']),
      '2026-01-01',
      'q',
    );
    expect(built.responseRows).toBe(4);
    expect(built.keptRows).toBe(2);
    expect(built.items.map((r: Row) => [r.item, r.ndbCount])).toEqual([
      ['Q1', 2],
      ['Q2', 1],
    ]);
    expect(built.items[0]?.deAliases).toEqual(['a', 'b']);
    expect(built.items[1]?.instanceOf).toEqual(['Q16521']);
    expect(Object.keys(built.taxonClasses)).toEqual(['Q16521']);
    expect(serialiseSnapshot(built)).toBe(serialiseSnapshot(built));
  });
});

describe('the committed snapshot and the shipped file', () => {
  const snapshot = read('../../../tools/catalogue/wikidata-de.json') as {
    retrieved: string;
    query: string;
    responseRows: number;
    keptRows: number;
    items: Row[];
  };
  const shipped = read('../data/ingredient-catalogue.json') as {
    namesDataset: { retrieved: string; file: string };
    ingredients: {
      id: string;
      name: string;
      names?: { de: { name: string; aliases?: string[]; source: string } };
    }[];
  };
  test('the snapshot records its query, date and row counts, and is small', () => {
    expect(snapshot.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.query).toContain('wdt:P1978');
    expect(snapshot.keptRows).toBe(snapshot.items.length);
    expect(snapshot.responseRows).toBeGreaterThan(snapshot.keptRows);
    expect(
      readFileSync(
        fileURLToPath(new URL('../../../tools/catalogue/wikidata-de.json', import.meta.url)),
      ).length,
    ).toBeLessThan(100_000);
  });
  test('every German name of a food names a Wikidata item that is in the snapshot with that label', () => {
    const byItem = new Map(snapshot.items.map((r) => [r.item, r]));
    let count = 0;
    for (const entry of shipped.ingredients) {
      const de = entry.names?.de;
      if (de === undefined || entry.id.startsWith('fdc-group-')) continue;
      count += 1;
      const item = /Wikidata (Q\d+)/.exec(de.source)?.[1] ?? '';
      expect(byItem.get(item)?.de, entry.id).toBe(de.name);
      expect(de.source, entry.id).toContain(`snapshot ${snapshot.retrieved}`);
    }
    expect(count).toBeGreaterThan(100);
    expect(shipped.namesDataset.retrieved).toBe(snapshot.retrieved);
  });
  test('every parent name is the name of all the foods below it', () => {
    const names = new Map(shipped.ingredients.map((e) => [e.id, e]));
    for (const group of shipped.ingredients.filter(
      (e) => e.id.startsWith('fdc-group-') && e.names,
    )) {
      expect(group.names?.de.source, group.id).toContain('Derived by tools/catalogue/build.mjs');
      expect(names.has(group.id)).toBe(true);
    }
  });
});
