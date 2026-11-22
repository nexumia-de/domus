// "What can I cook" on an everyday stock, with the real shipped catalogue and the 48 real classics:
// the twelve foods a tester ticked in German (2026-11-21) and salt and pepper marked always there.
// Pins: a group in stock covers a line naming a member (the engine's group rule, named in the
// row); a whole egg covers its yolk (the parts table); the ratio cards ask no water. Not proved
// here: the screen (e2e/everyday-stock.mjs), a stock with amounts, a real device.
import { expect, test } from 'vitest';
import { CLASSICS } from '../src/classics';
import { find } from '../src/cook/finder';
import { cookRow } from '../src/cook/rows';
import { byId, SALT_AND_PEPPER, sourceOf, TICKED_IDS } from './everyday-stock.helpers';
import { must } from './must';

const TODAY = '2026-11-21';
const shipped = { classics: CLASSICS, catalogue: byId, lang: 'de' as const };

test('the twelve and salt and pepper make shipped dishes complete', () => {
  const found = find(sourceOf(TICKED_IDS, SALT_AND_PEPPER), TODAY, { lacking: 0 }, { shipped });
  if (!found.ok) throw new Error('finder');
  const dishes = found.dishes.map((c) => c.id);
  // On 2026-11-21: egg noodles, potato dumplings, gratin dauphinois, potato purée, Parmesan
  // soufflé, risotto alla milanese, baked potatoes with cheese.
  for (const id of ['egg-noodles', 'kartoffelkloesse', 'pure-de-patatas', 'risotto-alla-milanese'])
    expect(dishes, id).toContain(id);
  expect(dishes.length).toBeGreaterThanOrEqual(7);
  // The egg noodles want "Egg, whole"; the stock holds the group "Egg": named, not hidden.
  const noodles = must(found.dishes.find((c) => c.id === 'egg-noodles'));
  expect(noodles.lines.some((l) => l.through?.asked === 'fdc-group-egg-whole')).toBe(true);
  const row = cookRow({ ...noodles, kind: 'dish' }, found.classicLook, () => []);
  expect(row.substitutions.join(' ')).toContain('Hühnerei');
  // The ratio cards: no water asked, the egg of the pasta dough is the egg group in stock.
  const parts = found.parts.map((c) => c.id);
  for (const id of ['pasta-dough', 'pie-dough', 'bread-dough-ratio'])
    expect(parts, id).toContain(id);
});

test('without salt and pepper, salt is all the egg noodles lack', () => {
  const found = find(sourceOf(TICKED_IDS, []), TODAY, { lacking: 1 }, { shipped });
  if (!found.ok) throw new Error('finder');
  const noodles = must(found.dishes.find((c) => c.id === 'egg-noodles'));
  const lacking = noodles.lines.filter((l) => l.status === 'missing' || l.status === 'short');
  expect(lacking.map((l) => l.ref?.id)).toEqual(['fdc-173468']);
});

test('a fresh whole egg covers the yolk of a classic through the parts table', () => {
  const source = sourceOf(['fdc-171287', 'fdc-group-butter'], SALT_AND_PEPPER);
  const found = find(source, TODAY, { lacking: 3 }, { shipped });
  if (!found.ok) throw new Error('finder');
  const yolk = found.dishes.flatMap((c) => c.lines).find((l) => l.ref?.id === 'fdc-group-egg-yolk');
  expect(yolk?.through).toEqual({
    rule: 'part',
    asked: 'fdc-group-egg-yolk',
    inStock: 'fdc-171287',
    itemId: 'fdc-171287',
  });
});
