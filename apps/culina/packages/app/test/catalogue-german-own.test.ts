// The project's own German names: every catalogue entry has one, an own translation is marked as
// such and never replaces a Wikidata name, names stay distinguishable, the overlay and the shipped
// file agree, and a search by the everyday word finds the food.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { serialise } from '../../../tools/catalogue/build.mjs';
import { isOwnName, mergeOwnNames, ownSource } from '../../../tools/catalogue/own-names.mjs';
import { catalogueTree, searchTree } from '../src/catalogue/tree';
import type { IngredientRecord } from '../src/records';
import { must } from './must';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));
const text = (url: string): string =>
  readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8');

interface Entry {
  id: string;
  name: string;
  parentId?: string;
  names?: { de?: { name: string; aliases?: string[]; source: string } };
}
interface Overlay {
  dataset: { date: string; licence: string; name: string; file: string };
  uncertain: Record<string, string>;
  names: Record<string, { name: string; aliases?: string[] }>;
}
const shipped = read('../data/ingredient-catalogue.json') as {
  ingredients: Entry[];
  ownNamesDataset: { licence: string; retrieved: string };
};
const overlay = read('../../../tools/catalogue/names-de-own.json') as Overlay;
const all = shipped.ingredients;
const deOf = (e: Entry) => must(e.names?.de);
const isWikidata = (e: Entry) => deOf(e).source.startsWith('Wikidata');
const isDerived = (e: Entry) => deOf(e).source.startsWith('Derived by tools/catalogue/build.mjs');

describe('every ingredient has a German name', () => {
  test('all entries, foods and parents', () => {
    const without = all.filter((e) => e.names?.de === undefined).map((e) => e.id);
    expect(without).toEqual([]);
  });
  test('each name is a plain text of reasonable length and no name repeats its alias', () => {
    for (const e of all) {
      const de = deOf(e);
      expect(de.name.trim(), e.id).toBe(de.name);
      expect(de.name.length, e.id).toBeGreaterThan(1);
      expect(de.aliases ?? [], e.id).not.toContain(de.name);
    }
  });
});

describe('own translations are marked', () => {
  test('every name has either a Wikidata, a derived or an own source, and own ones say so', () => {
    for (const e of all) {
      const de = deOf(e);
      const kinds = [isWikidata(e), isDerived(e), isOwnName(de)].filter(Boolean).length;
      expect(kinds, e.id).toBe(1);
    }
    const own = all.filter((e) => isOwnName(deOf(e)));
    expect(own.length).toBe(Object.keys(overlay.names).length);
    for (const e of own) expect(deOf(e).source).toBe(ownSource(overlay.dataset.date));
  });
  test('the overlay names its licence and the envelope repeats it', () => {
    expect(overlay.dataset.licence).toMatch(/^AGPL-3\.0-or-later/);
    expect(shipped.ownNamesDataset.licence).toBe(overlay.dataset.licence);
    expect(shipped.ownNamesDataset.retrieved).toBe(overlay.dataset.date);
  });
  test('a Wikidata name is never replaced: the overlay has no id that Wikidata named', () => {
    for (const id of Object.keys(overlay.names)) {
      const e = must(all.find((x) => x.id === id));
      expect(isWikidata(e) || isDerived(e), id).toBe(false);
    }
  });
  test('merging the overlay into the shipped file changes nothing, and is stable', () => {
    const once = mergeOwnNames(shipped.ingredients, overlay);
    expect(once.keptOther).toBe(0);
    expect(once.unknown).toEqual([]);
    expect(JSON.stringify(once.ingredients)).toBe(JSON.stringify(shipped.ingredients));
    const twice = mergeOwnNames(once.ingredients, overlay);
    expect(JSON.stringify(twice.ingredients)).toBe(JSON.stringify(once.ingredients));
    expect(text('../data/ingredient-catalogue.json').endsWith('\n')).toBe(true);
    expect(text('../data/ingredient-catalogue.json')).toBe(
      serialise({
        ...(read('../data/ingredient-catalogue.json') as object),
        ingredients: once.ingredients,
      } as never),
    );
  });
  test('the merge keeps a Wikidata name, replaces an older own one and reports unknown ids', () => {
    const rows = [
      { id: 'a', names: { de: { name: 'Wiki', source: 'Wikidata Q1, label de' } } },
      { id: 'b', names: { de: { name: 'Alt', source: ownSource('2020-01-01') } } },
      { id: 'c' },
    ];
    const lay = {
      dataset: { date: '2026-11-19' },
      names: {
        a: { name: 'Eigen' },
        b: { name: 'Neu', aliases: ['N'] },
        c: { name: 'Cee' },
        z: { name: 'Zed' },
      },
    };
    const out = mergeOwnNames(rows, lay);
    expect(out.keptOther).toBe(1);
    expect(out.merged).toBe(2);
    expect(out.unknown).toEqual(['z']);
    const [a, b, c] = out.ingredients as typeof rows;
    expect(a?.names?.de.name).toBe('Wiki');
    expect(b?.names?.de).toEqual({ name: 'Neu', aliases: ['N'], source: ownSource('2026-11-19') });
    expect((c as Entry).names?.de?.name).toBe('Cee');
    expect(rows[2]).toEqual({ id: 'c' });
  });
  test('uncertain translations name an id of the overlay', () => {
    for (const id of Object.keys(overlay.uncertain)) expect(overlay.names[id], id).toBeDefined();
  });
});

describe('names stay distinguishable', () => {
  /** Own names that share a German name with a Wikidata one on purpose: the plain everyday word
   * of the group, which Wikidata gave to a single variant (and, for milk and vinegar, to several). */
  const SHARED_WITH_WIKIDATA = new Set([
    'fdc-group-milk',
    'fdc-group-vinegar',
    'fdc-group-wheat-flour',
  ]);
  const byName = new Map<string, Entry[]>();
  for (const e of all) byName.set(deOf(e).name, [...(byName.get(deOf(e).name) ?? []), e]);
  const shared = [...byName.entries()].filter(
    ([, list]) => new Set(list.map((e) => e.name)).size > 1,
  );

  test('no two own names are the same unless the English name is too', () => {
    const own = shared.filter(([, list]) => list.filter((e) => isOwnName(deOf(e))).length > 0);
    for (const [name, list] of own) {
      const ownIds = list.filter((e) => isOwnName(deOf(e))).map((e) => e.id);
      expect(
        ownIds.every((id) => SHARED_WITH_WIKIDATA.has(id)),
        `${name}: ${list.map((e) => e.id).join(', ')}`,
      ).toBe(true);
    }
  });
  test('the allowed sharing is only with a name that came from Wikidata', () => {
    for (const id of SHARED_WITH_WIKIDATA) {
      const name = deOf(must(all.find((e) => e.id === id))).name;
      const others = must(byName.get(name)).filter((e) => e.id !== id);
      expect(
        others.some((e) => isWikidata(e) || isDerived(e)),
        id,
      ).toBe(true);
    }
  });
  test('the names Wikidata gave to several foods are the ones listed here (known, not ours)', () => {
    const wikidata = shared
      .filter(
        ([, list]) => new Set(list.filter((e) => !isOwnName(deOf(e))).map((e) => e.name)).size > 1,
      )
      .map(([name]) => name)
      .sort();
    expect(wikidata).toEqual(
      [
        'Ananas',
        'Apfel',
        'Birne',
        'Essig',
        'Fischöl',
        'Guaven',
        'Margarine',
        'Milch',
        'Orange',
        'Sahne',
        'Shortening',
      ].sort(),
    );
  });
  test('cooked-or-raw, salted-or-unsalted and fat content stay apart', () => {
    const name = (id: string) => deOf(must(all.find((e) => e.id === id))).name;
    expect(name('fdc-173410')).not.toBe(name('fdc-173430')); // butter salted, unsalted
    expect(name('fdc-172205')).not.toBe(name('fdc-173441')); // milk 2 % and 1 %
    expect(name('fdc-171287')).not.toBe(name('fdc-172188')); // egg fresh, dried
    expect(name('fdc-173410')).toMatch(/gesalzen/);
    expect(name('fdc-173430')).toMatch(/ungesalzen/);
  });
});

describe('the everyday word finds the food', () => {
  const records = all as unknown as IngredientRecord[];
  const found = (needle: string) =>
    searchTree(catalogueTree(records), needle, () => true).flatMap(function walk(f): string[] {
      return [...(f.hit ? [f.entry.id] : []), ...f.children.flatMap(walk)];
    });
  test('"Zwiebel" finds the onion, and "zwiebel" in any case', () => {
    expect(found('Zwiebel')).toContain('fdc-170000');
    expect(found('zwiebel')).toContain('fdc-170000');
    expect(found('Zwiebel')).toContain('fdc-171327'); // onion powder stays found
  });
  test('the examples of the translation rules', () => {
    const name = (id: string) => deOf(must(all.find((e) => e.id === id))).name;
    expect(name('fdc-170028')).toBe('Kartoffel');
    expect(deOf(must(all.find((e) => e.id === 'fdc-170028'))).aliases).toContain(
      'Kartoffel, mit Schale',
    );
    expect(name('fdc-171287')).toBe('Ei, frisch');
    expect(name('fdc-group-egg-whole')).toBe('Ei');
    expect(name('fdc-172684')).toBe('Roggenbrot');
    expect(name('fdc-171256')).toBe('Saure Sahne, fettreduziert');
    expect(found('Quark')).toEqual([]); // no quark in the catalogue: nothing invented
  });
  test('no name claims a flour type number', () => {
    for (const e of all) {
      const de = deOf(e);
      expect([de.name, ...(de.aliases ?? [])].join(' '), e.id).not.toMatch(/\bType\s*\d/i);
    }
  });
});
