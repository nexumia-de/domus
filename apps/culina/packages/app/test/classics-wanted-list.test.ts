// The reviewed list of what the shipped classics still name as `wanted`, with the number of lines of
// each. A line not matched to the catalogue must be added here by a reviewer: an unlisted name, or a
// listed one that was matched since, fails the test. Why they stay: docs/ingredient-catalogue.md.
import { describe, expect, test } from 'vitest';
import { copyClassic } from '@culina/engine';
import { CLASSICS } from '../src/classics/index';
import { listWanted } from './classics-wanted';

const ALLOWED: readonly (readonly [string, number])[] = [
  ['Beef bone', 1],
  ['Beef bones', 1],
  ['Beef extract', 1],
  ['Boiled meat (lesso)', 1],
  ['Bouquet garni', 1],
  ['Cheese (cacio)', 2],
  ['Chicken blood', 1],
  ['Chocolate', 1],
  ['Dashi (kombu and bonito stock)', 1],
  ['Fatty ham (prosciutto grasso)', 1],
  ['Fine herbs', 1],
  ['Fresh berries', 1],
  ['Fresh berries, sugared', 1],
  ['Herring milt', 1],
  ['Juniper berries', 2],
  ['Kidney suet', 1],
  ['Orange-flower water', 2],
  ['Red curry paste', 1],
  ['Shelled fresh beans', 1],
  ['Soup vegetables', 1],
  ['Tarragon', 1],
  ['Water (the cooking water of the peas)', 1],
];

/**
 * The shipped recipes that cannot be kept in the notebook, each with the wanted lines that block it
 * (2026-11-24; not yet read by a reviewer): the reason for each name is in docs/ingredient-catalogue.md.
 */
const NOT_KEPT: Record<string, string[]> = {
  frikandelle: ['Kidney suet', 'Juniper berries'],
  'marinierte-heringe': ['Herring milt', 'Tarragon'],
  'potato-soup-fine': ['Soup vegetables', 'Beef extract'],
  'rote-gruetze': ['Fresh berries', 'Fresh berries, sugared'],
  sauerbraten: ['Juniper berries'],
  'arlequin-de-judias': ['Fine herbs'],
  'cocido-ordinario': ['Beef bone'],
  'crema-de-chocolate': ['Chocolate'],
  'flan-clasico': ['Orange-flower water'],
  'huevos-amerengados': ['Orange-flower water'],
  'pot-au-feu': ['Beef bones'],
  'potage-pois-verts-maigre': ['Water (the cooking water of the peas)'],
  'poulet-bourguignonne': ['Chicken blood', 'Bouquet garni'],
  'gnocchi-di-patate': ['Cheese (cacio)'],
  'tagliatelle-verdi': ['Cheese (cacio)'],
  minestrone: ['Boiled meat (lesso)', 'Shelled fresh beans', 'Fatty ham (prosciutto grasso)'],
  'miso-shiru': ['Dashi (kombu and bonito stock)'],
  'kaeng-phet-kai': ['Red curry paste'],
};

describe('the wanted allow-list', () => {
  test('names exactly the wanted lines of the shipped classics', () => {
    const found = new Map<string, number>();
    for (const w of listWanted()) found.set(w.wanted.en, (found.get(w.wanted.en) ?? 0) + 1);
    expect([...found.entries()].sort()).toEqual([...ALLOWED].map(([n, c]) => [n, c]).sort());
  });
});

describe('which shipped recipes can be kept in the notebook', () => {
  const blocking = new Map<string, string[]>();
  for (const w of listWanted())
    blocking.set(w.classic, [...(blocking.get(w.classic) ?? []), w.wanted.en]);

  test('117 of 135 can be kept (114 before 2026-11-24); the 18 that cannot are named with the lines that block them', () => {
    expect(CLASSICS).toHaveLength(135);
    expect(CLASSICS.length - blocking.size).toBe(117);
    expect(Object.fromEntries(blocking)).toEqual(NOT_KEPT);
  });

  test('keeping refuses exactly those, naming the same lines; every other recipe is copied', () => {
    // The engine's copy, not the app's store: proves the refusal and its names, not a written notebook.
    // It passes on the content before this change too: it pins that keeping and the list above agree.
    let n = 0;
    for (const classic of CLASSICS) {
      const kept = copyClassic(classic, {
        lang: 'en',
        date: '2026-11-24',
        newId: () => `u-${++n}`,
      });
      const blocked = blocking.get(classic.id);
      if (blocked === undefined) {
        expect(kept.ok, classic.id).toBe(true);
      } else {
        expect(kept.ok, classic.id).toBe(false);
        if (!kept.ok) expect(kept.error, classic.id).toMatchObject({ code: 'wanted-ingredient' });
        if (!kept.ok && kept.error.code === 'wanted-ingredient') {
          expect([...kept.error.wanted].sort(), classic.id).toEqual([...blocked].sort());
        }
      }
    }
  });
});
