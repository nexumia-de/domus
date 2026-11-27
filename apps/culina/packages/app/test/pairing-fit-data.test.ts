// The fit in bands on the shipped files: the thresholds against the distribution they were read
// from, every catalogue ingredient with a band, and the dish editor's eight offers unchanged.
// What a cook tastes is not tested: the expectations on real ingredients only pin what the rule
// gave on the data fetched on 2026-11-23, so that a change of rule or data shows.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { FIT_SOME, FIT_STRONG, pairingFit } from '@culina/engine';
import { AFFINITIES } from '../src/pairing/affinity';
import { preparePairings, readLinks, readPairings } from '../src/pairing/load';
import { entityOf, fitView, pairingView } from '../src/pairing/view';

const path = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
const read = (p: string): unknown => JSON.parse(readFileSync(path(p), 'utf8'));
const data = readPairings(read('../data/flavour-pairings.json'));
const links = readLinks(read('../data/flavour-links.json'));
if (!data || !links) throw new Error('the shipped pairing files cannot be read');
const loaded = preparePairings(data, links);
const catalogue = (
  read('../data/ingredient-catalogue.json') as {
    ingredients: { id: string; name: string; parentId?: string }[];
  }
).ingredients;
const byId = new Map(catalogue.map((i) => [i.id, i]));
const names = {
  parentOf: (id: string) => byId.get(id)?.parentId,
  nameOf: (id: string) => byId.get(id)?.name ?? id,
};
const pan = (...lines: [string, string][]) =>
  lines.map(([ingredient, name]) => ({ ingredient, name }));
// The owner's pan of 2026-11-27 (decisions/daily-helper.md) and a sauce.
const owners = pan(
  ['fdc-170393', 'Carrots'],
  ['fdc-group-mushrooms', 'Mushrooms'],
  ['fdc-170000', 'Onions'],
  ['fdc-171412', 'Coconut oil'],
);
const sauce = pan(
  ['fdc-group-tomatoes', 'Tomatoes'],
  ['fdc-172232', 'Basil'],
  ['fdc-169230', 'Garlic'],
);

/** The linked entities of the ingredient lines of every shipped dish that has one. */
const shippedPans = (): number[][] => {
  const pans: number[][] = [];
  for (const country of readdirSync(path('../data/classics'))) {
    for (const file of readdirSync(path(`../data/classics/${country}`))) {
      if (!file.endsWith('.json')) continue;
      const dish = read(`../data/classics/${country}/${file}`) as {
        components?: { lines?: { ref?: { kind: string; id: string } }[] }[];
      };
      const ids = new Set<number>();
      for (const component of dish.components ?? [])
        for (const line of component.lines ?? []) {
          if (line.ref?.kind !== 'ingredient') continue;
          const entity = entityOf(line.ref.id, loaded, names.parentOf);
          if (entity !== undefined) ids.add(entity);
        }
      if (ids.size > 0) pans.push([...ids]);
    }
  }
  return pans;
};

test('the thresholds are the 95th and the 80th percentile over the shipped dishes, to a quarter', () => {
  const candidates = [...loaded.candidates].map((entity) => ({ key: String(entity), entity }));
  const pans = shippedPans();
  const scores = pans
    .flatMap((ids) =>
      pairingFit(
        ids.map((entity) => ({ key: String(entity), entity })),
        candidates,
        loaded.data,
        {},
        loaded.weights,
        loaded.baselines,
      ).flatMap((fit) => (fit.score === undefined ? [] : [fit.score])),
    )
    .sort((a, b) => a - b);
  const at = (p: number): number => scores[Math.floor(p * scores.length)] as number;
  const quarter = (n: number): number => Math.round(n * 4) / 4;
  expect([pans.length, scores.length]).toEqual([135, 28360]);
  expect([at(0.95), at(0.8)]).toEqual([0.739, 0.198]);
  expect([quarter(at(0.95)), quarter(at(0.8))]).toEqual([FIT_STRONG, FIT_SOME]);
});

test('the dish editor offers the same eight as before the fit was added', () => {
  // Pinned from pairingView on b07e7e6, before `standOut` was taken out of `pairingsForDish`.
  const offers = (lines: ReturnType<typeof pan>) => {
    const view = pairingView(lines, loaded, names);
    return view.kind === 'rows' ? view.rows.map((row) => [row.ingredient, row.with]) : view.kind;
  };
  expect(offers(sauce)).toEqual([
    ['fdc-169231', ['Basil', 'Tomatoes', 'Garlic']],
    ['fdc-171328', ['Basil', 'Garlic', 'Tomatoes']],
    ['fdc-group-guavas', ['Tomatoes', 'Basil', 'Garlic']],
    ['fdc-group-oranges', ['Basil', 'Tomatoes', 'Garlic']],
    ['fdc-170000', ['Garlic']],
    ['fdc-group-peppers', ['Basil', 'Garlic', 'Tomatoes']],
    ['fdc-170917', ['Basil', 'Tomatoes', 'Garlic']],
    ['fdc-169988', ['Basil', 'Tomatoes', 'Garlic']],
  ]);
  expect(offers(owners)).toEqual([
    ['fdc-group-milk', ['Coconut oil', 'Mushrooms', 'Onions']],
    ['fdc-group-butter', ['Coconut oil', 'Mushrooms', 'Carrots']],
    ['fdc-173414', ['Coconut oil', 'Mushrooms', 'Onions']],
    ['fdc-group-pork', ['Mushrooms', 'Coconut oil', 'Onions']],
    ['fdc-group-beef', ['Mushrooms', 'Coconut oil', 'Carrots']],
    ['fdc-group-soybeans', ['Mushrooms', 'Coconut oil', 'Onions']],
    ['fdc-group-chicken', ['Mushrooms', 'Coconut oil', 'Onions']],
    ['fdc-169231', ['Carrots', 'Coconut oil', 'Mushrooms']],
  ]);
});

test('every catalogue ingredient not in the pan has one band; without a link it is none, last', () => {
  const ids = catalogue.map((i) => i.id);
  for (const lines of [owners, sauce]) {
    const view = fitView(lines, ids, loaded, names, AFFINITIES);
    expect(view.known).toBe(true);
    const rows = view.rows.map((row) => row.ingredient);
    expect(new Set(rows).size).toBe(rows.length);
    const firstNone = view.rows.findIndex((row) => row.band === 'none');
    expect(view.rows.slice(firstNone).every((row) => row.band === 'none')).toBe(true);
    for (const id of ids) {
      if (!rows.includes(id)) continue;
      const row = view.rows.find((r) => r.ingredient === id);
      if (entityOf(id, loaded, names.parentOf) === undefined) expect(row?.band, id).toBe('none');
      if (row?.band === 'none') expect(row.with, id).toEqual([]);
    }
    // The editor's eight stand in the strongest band.
    const view8 = pairingView(lines, loaded, names);
    if (view8.kind !== 'rows') throw new Error('no offers');
    for (const offer of view8.rows)
      expect(view.rows.find((r) => r.ingredient === offer.ingredient)?.band).toBe('strong');
  }
});

test('the owner pan: bands, reasons and proven marks as the rule gave them', () => {
  const view = fitView(
    owners,
    catalogue.map((i) => i.id),
    loaded,
    names,
    AFFINITIES,
  );
  const count: Record<string, number> = {};
  for (const row of view.rows) count[row.band] = (count[row.band] ?? 0) + 1;
  expect(count).toEqual({ strong: 209, some: 120, little: 245, none: 195 });
  const row = (id: string) => {
    const found = view.rows.find((r) => r.ingredient === id);
    return found && [found.band, found.with, found.proven];
  };
  expect(row('fdc-169231')).toEqual([
    'strong',
    ['Carrots', 'Coconut oil', 'Mushrooms'],
    ['Carrots'],
  ]);
  expect(row('fdc-169230')).toEqual(['some', ['Onions', 'Carrots', 'Coconut oil'], ['Mushrooms']]);
  expect(row('fdc-174277')).toEqual(['little', ['Coconut oil'], []]);
  // Cream: proven with mushrooms, but FlavorDB's cream has too few molecules; no data, no verdict.
  expect(row('fdc-group-cream')).toEqual(['none', [], ['Mushrooms']]);
});
