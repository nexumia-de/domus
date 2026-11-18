// The Cooklang completion step without a browser: a name is asked once, only an exact match is
// preselected, a choice moves the amount modes, and the decisions the engine gets.
import { describe, expect, test } from 'vitest';
import {
  buildCookModel,
  choose,
  createForUnset,
  decisionsOf,
  unresolvedNames,
} from '../src/exchange/cook-model';
import type { Candidate } from '@culina/engine';

const nb = (id: string, name: string, parentId?: string): Candidate => ({
  id,
  name,
  origin: 'notebook',
  ...(parentId === undefined ? {} : { parentId }),
});
const INGREDIENTS = [
  nb('alliums', 'Alliums'),
  nb('onion', 'Onion', 'alliums'),
  nb('flour', 'Flour'),
];
const FILE =
  'Mix @flour{200%g}, @onions{2}, @red onion{1%cup} and @saffron{1%pinch}.\n\nAdd @flour{1%tbsp} and @salt.\n';
const FACTS = { flour: { densityGPerMl: 0.5 } };
const facts = (t: { id: string }) => FACTS[t.id as 'flour'] ?? {};
const model = () =>
  buildCookModel(FILE, 'bread.cook', { ingredients: INGREDIENTS, components: [] });

describe('names', () => {
  test('a name that is used twice is asked once', () => {
    const m = model();
    expect(m.lines.map((l) => l.use.name)).toEqual([
      'flour',
      'onions',
      'red onion',
      'saffron',
      'flour',
      'salt',
    ]);
    expect(m.rows.map((r) => r.label)).toEqual(['flour', 'onions', 'red onion', 'saffron', 'salt']);
  });

  test('only an exact match (case and plural insensitive) is preselected', () => {
    const m = model();
    const by = Object.fromEntries(m.rows.map((r) => [r.label, r.choice]));
    expect(by.flour).toEqual({ type: 'existing', target: { kind: 'ingredient', id: 'flour' } });
    expect(by.onions).toEqual({ type: 'existing', target: { kind: 'ingredient', id: 'onion' } });
    expect(by['red onion']).toEqual({ type: 'unset' });
    expect(by.saffron).toEqual({ type: 'unset' });
    expect(unresolvedNames(m)).toBe(3);
  });

  test('a close match is offered but not chosen, with the class to file a new one under', () => {
    const row = model().rows.find((r) => r.label === 'red onion');
    expect(row?.options.map((o) => [o.target.id, o.tag])).toEqual([['onion', 'close']]);
    expect(row?.classes.map((c) => c.id)).toEqual(['alliums']);
  });

  test('"create new for all" only touches names that are still open', () => {
    const m = model();
    createForUnset(m);
    expect(unresolvedNames(m)).toBe(0);
    expect(m.rows.find((r) => r.label === 'flour')?.choice.type).toBe('existing');
    expect(m.rows.find((r) => r.label === 'saffron')?.choice).toEqual({ type: 'new' });
  });
});

describe('amounts', () => {
  test('defaults: as written when it can be read, open when it cannot', () => {
    const m = model();
    expect(m.lines.map((l) => l.mode)).toEqual([
      'given',
      'given',
      'given',
      'open',
      'given',
      'open',
    ]);
  });

  test('choosing the ingredient makes the density usable on every line with that name', () => {
    const m = model();
    choose(m, 'flour', { type: 'existing', target: { kind: 'ingredient', id: 'flour' } }, facts);
    const tbsp = m.lines[4];
    expect(tbsp).toBeDefined();
    if (tbsp) {
      tbsp.mode = 'facts';
      choose(m, 'flour', { type: 'new' }, facts);
      expect(tbsp.mode).toBe('given');
    }
  });

  test('decisions carry the target, the amount mode and the role', () => {
    const m = model();
    createForUnset(m);
    const first = m.lines[0];
    if (first) first.role = 'flour';
    const grams = m.lines[2];
    if (grams) {
      grams.mode = 'grams';
      grams.grams = '120,5';
    }
    const decisions = decisionsOf(m, (key) => ({ kind: 'ingredient', id: `new-${key}` }));
    expect(decisions[0]).toMatchObject({ amount: { mode: 'given' }, role: 'flour' });
    expect(decisions[2]).toMatchObject({ amount: { mode: 'grams', grams: 120.5 } });
    expect(decisions[3]).toMatchObject({ amount: { mode: 'open' } });
    expect(decisions[3]).not.toHaveProperty('role');
  });
});

describe('front matter', () => {
  test('title and a mass yield fill the form; another unit leaves the yield empty', () => {
    const a = buildCookModel('---\ntitle: Pan sauce\nyield: 0.5%kg\n---\n@a{1}', 'x.cook', {
      ingredients: [],
      components: [],
    });
    expect([a.title, a.yieldGrams]).toEqual(['Pan sauce', '500']);
    const b = buildCookModel('---\nyield: 500%ml\n---\n@a{1}', 'my-bread.cook', {
      ingredients: [],
      components: [],
    });
    expect([b.title, b.yieldGrams]).toEqual(['my bread', '']);
  });
});
