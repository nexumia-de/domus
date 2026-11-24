// The shipped pairing data and its links, as committed: what they are, that they are what the
// tools write, and that the lookups give something on them. What a cook thinks of the pairings
// is not tested: the expectations on real ingredients below only pin what the rule gave on the
// data fetched on 2026-11-23, so that a change of rule or data shows.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { entityByName, familyOf, pairingsFor } from '@culina/engine';
import { FORMAT, LICENCE } from '../../../tools/flavordb/derive.mjs';
import { buildLinks } from '../../../tools/flavordb/link-build.mjs';
import { preparePairings, readLinks, readPairings } from '../src/pairing/load';
import { pairingView } from '../src/pairing/view';

const read = (path: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'));
const pairingsFile = read('../data/flavour-pairings.json') as {
  format: string;
  dataset: { licence: string; name: string; citation: string; fetched: string };
};
const linksFile = read('../data/flavour-links.json');
const catalogue = read('../data/ingredient-catalogue.json') as {
  ingredients: { id: string; name: string; parentId?: string }[];
};
const data = readPairings(pairingsFile);
const links = readLinks(linksFile);
if (!data || !links) throw new Error('the shipped pairing files cannot be read');

test('the pairing file names FlavorDB, its licence and the paper, and has the entities fetched', () => {
  expect(pairingsFile.format).toBe(FORMAT);
  expect(pairingsFile.dataset).toMatchObject({ name: 'FlavorDB', licence: LICENCE });
  expect(pairingsFile.dataset.citation).toContain('gkx957');
  expect(pairingsFile.dataset.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(data.entities).toHaveLength(936);
  expect(Object.keys(data.molecules)).toHaveLength(1788);
  for (const entity of data.entities) {
    expect([...entity.molecules].sort((a, b) => a - b)).toEqual(entity.molecules);
    for (const id of entity.molecules) expect(data.molecules[String(id)], `${id}`).toBeDefined();
  }
});

test('the links file is what the rule and the corrections give, without problems', () => {
  const built = buildLinks(
    catalogue,
    data,
    read('../../../tools/flavordb/links-own.json') as Parameters<typeof buildLinks>[2],
  );
  expect(built.problems).toEqual([]);
  expect(built.data).toEqual(linksFile);
  const ids = new Set(catalogue.ingredients.map((i) => i.id));
  const entities = new Set(data.entities.map((e) => e.id));
  for (const [id, entity] of links) {
    expect(ids.has(id), id).toBe(true);
    expect(entities.has(entity), id).toBe(true);
  }
  expect(links.size).toBe(681);
});

test('the corrections hold: a black turtle bean is a bean, a sweet pepper a capsicum', () => {
  const linkOf = (name: string): string | undefined => {
    const id = catalogue.ingredients.find((i) => i.name.startsWith(name))?.id;
    const entity = id === undefined ? undefined : links.get(id);
    return data.entities.find((e) => e.id === entity)?.name;
  };
  expect(linkOf('Beans, black turtle')).toBe('Beans');
  expect(linkOf('Peppers, sweet')).toBe('Capsicum');
  expect(linkOf('Spices, pepper, black')).toBe('Pepper');
  expect(linkOf('Java-plum')).toBeUndefined();
});

test('pairings of a single ingredient come from other families and carry flavour words', () => {
  const strawberry = entityByName('strawberry', data);
  expect(strawberry).toBeDefined();
  const found = pairingsFor(strawberry?.id ?? -1, data);
  expect(found).toHaveLength(10);
  for (const p of found) {
    expect(familyOf(p.category)).not.toBe('fruit');
    expect(p.shared).toBeGreaterThanOrEqual(5);
    expect(p.flavours.length).toBeGreaterThan(0);
  }
});

test('the view of a dish of tomato, basil and garlic offers eight ingredients the dish does not have', () => {
  const loaded = preparePairings(data, links);
  const byId = new Map(catalogue.ingredients.map((i) => [i.id, i]));
  const idOf = (name: string): string => {
    const found = catalogue.ingredients.find((i) => i.name.startsWith(name));
    if (!found) throw new Error(name);
    return found.id;
  };
  const lines = ['Tomatoes', 'Basil', 'Garlic'].map((name) => ({ ingredient: idOf(name), name }));
  const view = pairingView(lines, loaded, {
    parentOf: (id) => byId.get(id)?.parentId,
    nameOf: (id) => byId.get(id)?.name ?? id,
  });
  expect(view.kind).toBe('rows');
  if (view.kind !== 'rows') return;
  expect(view.rows).toHaveLength(8);
  for (const row of view.rows) {
    expect(lines.map((l) => l.ingredient)).not.toContain(row.ingredient);
    expect(row.with.length).toBeGreaterThan(0);
  }
  console.log(view.rows.map((r) => `${r.name} (${r.with.join(', ')})`).join('; '));
});
