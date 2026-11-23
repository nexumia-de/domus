// The Cooklang completion step without a browser: a name is asked once, only an exact match is
// preselected, a choice moves the amount modes, and the decisions the engine gets.
import { describe, expect, test } from 'vitest';
import {
  buildCookModel,
  choose,
  componentParts,
  createForUnset,
  decisionsOf,
  lineRoles,
  partLines,
  partPreview,
  portionsAllowed,
  unresolvedNames,
  type PartRow,
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

describe('a file with sections', () => {
  const SECTIONS =
    '---\ntitle: Pancakes\nservings: 4 people\n---\n\nWhisk @flour{100%g}.\n\n= Topping\n\nWarm @butter{20%g}.\n\n= Serve\n\nStack them.\n';
  const dish = () =>
    buildCookModel(SECTIONS, 'pancakes.cook', { ingredients: INGREDIENTS, components: [] });

  test('becomes a dish; a part with lines becomes a component, named after its section or the file', () => {
    const m = dish();
    expect(m.dish).toBe(true);
    expect(componentParts(m).map((p) => [p.name, p.role])).toEqual([
      ['Pancakes', 'main'],
      ['Topping', 'main'],
    ]);
    expect(m.parts.map((p) => p.part.uses)).toEqual([[0], [1], []]);
    expect(partLines(m, m.parts[1] as PartRow).map((l) => l.use.name)).toEqual(['butter']);
  });

  test('the portions come from the leading number of servings; a file without sections is no dish', () => {
    expect(dish().portions).toBe('4');
    expect(model().dish).toBe(false);
    expect(model().parts).toHaveLength(1);
    expect([
      portionsAllowed(''),
      portionsAllowed('3'),
      portionsAllowed('0'),
      portionsAllowed('2.5'),
    ]).toEqual([true, true, false, false]);
  });

  test('parts that would share a name are named apart: "Teig (2)", also against the file title', () => {
    const m = buildCookModel(
      '---\ntitle: Teig\n---\n\nMix @flour{1%g}.\n\n= Teig\n\nAdd @salt{1%g}.\n\n= Serve\n\nServe.\n\n= TEIG\n\nAdd @butter{1%g}.\n',
      'x.cook',
      { ingredients: INGREDIENTS, components: [] },
    );
    expect(componentParts(m).map((p) => p.name)).toEqual(['Teig', 'Teig (2)', 'TEIG (3)']);
    // Controls: distinct names and a part without lines keep their names.
    expect(componentParts(dish()).map((p) => p.name)).toEqual(['Pancakes', 'Topping']);
    expect(m.parts.find((p) => p.part.uses.length === 0)?.name).toBe('Serve');
  });

  test('the text that becomes the note is shown on one line, cut at a word when long', () => {
    const m = buildCookModel(
      '> A family recipe.\n\nHeat the oven.\n\n= Dough\n\nMix @flour{1%g}.\n',
      'x.cook',
      { ingredients: INGREDIENTS, components: [] },
    );
    const lead = m.parts[0] as PartRow;
    expect(partPreview(lead)).toBe('A family recipe. Heat the oven.');
    expect(partPreview(lead, 20)).toBe('A family recipe.…');
  });

  test('a percent base is offered among the roles of the lines', () => {
    const m = dish();
    (m.lines[0] as { role: string }).role = 'flour';
    (m.lines[1] as { role: string }).role = 'Bad';
    expect(lineRoles(partLines(m, m.parts[0] as PartRow))).toEqual(['flour']);
    expect(lineRoles(partLines(m, m.parts[1] as PartRow))).toEqual([]);
  });
});
