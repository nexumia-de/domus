// What a dish lacks as things for the shopping list (src/handover/lacking.ts) from the finder's
// report of one dish (`classicReport`, `dishReport`). The frame and the ingredients are invented;
// no shipped file is read. What this does not prove: the names and the words of an amount are
// stand-ins here (the app gives the catalogue's kitchen names and its own amount words), and
// nothing is written to a list (the app's handOver tests do that).
import { describe, expect, test } from 'vitest';
import { chooseAlternative, classicReport, dishReport, lackingItems } from '../src/index';
import { freeLines, lackingLines } from '../src/handover/lacking';
import type {
  Amount,
  Classic,
  ClassicComponent,
  ComponentRef,
  MakeableInput,
  MakeableStockItem,
} from '../src/index';

const t = (en: string): { en: string; de: string } => ({ en, de: `${en} (de)` });

const component = (id: string, role: string, ingredient: string, g = 100): ClassicComponent => ({
  id,
  name: t(id),
  role,
  lines: [{ ref: { kind: 'ingredient', id: ingredient }, amount: { value: g, unit: 'g' } }],
});

/** An invented frame for 4: a shell and a filling (beans; squash as the alternative), a garnish. */
const frame = (over: Partial<Classic> = {}): Classic => ({
  id: 'example-frame',
  kind: 'base',
  name: t('Example frame'),
  originalName: 'Example frame',
  country: 'es',
  vegetarian: true,
  course: 'main',
  source: { author: 'A', title: 'B', year: 2000, place: 'p. 1', url: 'https://example.org/' },
  persons: { value: 4, basis: 'stated' },
  components: [
    {
      ...component('shell', 'starch', 'i-flour', 200),
      lines: [
        { ref: { kind: 'ingredient', id: 'i-flour' }, amount: { value: 200, unit: 'g' } },
        { ref: { kind: 'ingredient', id: 'i-water' }, amount: { value: 100, unit: 'ml' } },
        { ref: { kind: 'ingredient', id: 'i-butter' }, amount: { value: 40, unit: 'g' } },
        { wanted: t('Masa harina') },
      ],
    },
    component('beans', 'main', 'i-beans', 300),
    component('squash', 'main', 'i-squash', 400),
  ],
  slots: [
    { role: 'starch', ref: { kind: 'component', id: 'shell' }, amount: { value: 340, unit: 'g' } },
    { role: 'main', ref: { kind: 'component', id: 'beans' }, amount: { value: 300, unit: 'g' } },
    {
      role: 'garnish',
      ref: { kind: 'ingredient', id: 'i-coriander' },
      amount: { value: 10, unit: 'g' },
      optional: true,
    },
  ],
  settled: [],
  check: { method: 'second-reader', note: 'invented' },
  ...over,
});

const ingredients = [
  { id: 'i-flour' },
  { id: 'i-water', roles: ['water'] },
  { id: 'i-butter' },
  { id: 'i-legumes' },
  { id: 'i-beans', parentId: 'i-legumes' },
  { id: 'i-lentils', parentId: 'i-legumes' },
  { id: 'i-squash' },
  { id: 'i-coriander' },
];

const NAMES: Record<string, string> = {
  'i-flour': 'Flour',
  'i-butter': 'Butter',
  'i-beans': 'Black beans',
  'i-squash': 'Squash',
  'i-coriander': 'Coriander',
};
const options = {
  nameOf: (ref: ComponentRef): string => NAMES[ref.id] ?? ref.id,
  amountText: (a: Amount): string => `${a.value} ${a.unit}`,
};

const lacking = (classic: Classic, stock: MakeableStockItem[], portions = 4) => {
  const report = classicReport({
    classic,
    portions,
    lang: 'en',
    ingredients,
    stock,
    today: '2026-11-24',
  });
  if (!report.ok) throw new Error(report.error.code);
  return lackingLines(report, options);
};

const item = (id: string, ingredient: string, amount?: Amount): MakeableStockItem => ({
  id,
  ref: { kind: 'ingredient', id: ingredient },
  ...(amount === undefined ? {} : { amount }),
});

describe('lackingItems, the reading without the list package', () => {
  test('gives one item per line lackingLines writes, in its order, and the same free names (what the dish page counts is what the confirmation lists)', () => {
    for (const [stock, portions] of [
      [[], 4],
      [[item('s1', 'i-flour', { value: 50, unit: 'g' })], 4],
      [[item('s1', 'i-flour'), item('s2', 'i-butter')], 8],
    ] as const) {
      const report = classicReport({
        classic: frame(),
        portions,
        lang: 'en',
        ingredients,
        stock: [...stock],
        today: '2026-11-24',
      });
      if (!report.ok) throw new Error(report.error.code);
      const read = lackingItems(report, options.nameOf);
      const written = lackingLines(report, options);
      expect(read.items.map((i) => i.ref.id)).toEqual(written.lines.map((l) => l.ingredientId));
      expect(read.free).toEqual(written.free);
    }
  });
});

describe('lackingLines', () => {
  test('with nothing in stock every required line lacks, with its need; the optional garnish does not, and water reports `have` (the kitchen’s), so it never lacks', () => {
    const { lines, free } = lacking(frame(), []);
    expect(lines.map((l) => [l.name, l.ingredientId, l.amount])).toEqual([
      ['Flour', 'i-flour', '200 g'],
      ['Butter', 'i-butter', '40 g'],
      ['Black beans', 'i-beans', '300 g'],
    ]);
    expect(free).toEqual(['Masa harina']);
  });

  test('each line is list input: a recipe origin of Culina with the dish, the default priority, the usual item as catalogue category', () => {
    const [flour] = lacking(frame(), []).lines;
    expect(flour).toEqual({
      name: 'Flour',
      ingredientId: 'i-flour',
      amount: '200 g',
      priority: 'soon',
      origins: [{ kind: 'recipe', app: 'culina', title: 'Example frame' }],
      catalogue: { ingredientId: 'i-flour', categoryId: 'baking' },
    });
  });

  test('the portions scale what is asked for', () => {
    const { lines } = lacking(frame(), [], 2);
    expect(lines.map((l) => l.amount)).toEqual(['100 g', '20 g', '150 g']);
  });

  test('a frame is judged with the chosen filling, not the shipped one (control: the shipped one asks for beans)', () => {
    const chosen = chooseAlternative(frame(), 1, 'squash');
    expect(lacking(chosen, []).lines.map((l) => l.ingredientId)).toEqual([
      'i-flour',
      'i-butter',
      'i-squash',
    ]);
    expect(lacking(frame(), []).lines.map((l) => l.ingredientId)).toContain('i-beans');
  });

  test('a short line asks for the need less what is there, in the line’s unit', () => {
    const { lines } = lacking(frame(), [item('s1', 'i-flour', { value: 150, unit: 'g' })]);
    expect(lines.find((l) => l.ingredientId === 'i-flour')?.amount).toBe('50 g');
  });

  test('a line that is there, by a sibling or through a group, does not lack', () => {
    const own = lacking(frame(), [item('s1', 'i-beans')]).lines;
    const sibling = lacking(frame(), [item('s1', 'i-lentils')]).lines;
    const group = lacking(frame(), [item('s1', 'i-legumes')]).lines;
    for (const lines of [own, sibling, group])
      expect(lines.map((l) => l.ingredientId)).toEqual(['i-flour', 'i-butter']);
  });

  test('a line whose amount cannot be compared lacks nothing; a missing line without an amount goes without one', () => {
    const noAmount = frame({
      slots: [{ role: 'main', ref: { kind: 'ingredient', id: 'i-beans' } }],
      components: [],
    });
    expect(lacking(noAmount, []).lines).toEqual([
      expect.not.objectContaining({ amount: expect.anything() }),
    ]);
    // 150 g of flour in stock and a count of butter that does not convert: flour is short, butter
    // is "there, amount unknown" and is not asked for.
    const { lines } = lacking(frame(), [
      item('s1', 'i-flour', { value: 150, unit: 'g' }),
      item('s2', 'i-butter', { value: 1, unit: 'count' }),
    ]);
    expect(lines.map((l) => l.ingredientId)).toEqual(['i-flour', 'i-beans']);
  });

  test('the spoon the source wrote reaches the amount text with the millilitres; the dish key goes into the origin', () => {
    const spoon = frame({
      components: [
        {
          ...component('shell', 'starch', 'i-flour'),
          lines: [
            { ref: { kind: 'ingredient', id: 'i-butter' }, amount: { value: 2, unit: 'tbsp' } },
          ],
        },
        component('beans', 'main', 'i-beans', 300),
      ],
    });
    const report = classicReport({
      classic: spoon,
      portions: 4,
      lang: 'en',
      ingredients,
      stock: [],
      today: '2026-11-24',
    });
    if (!report.ok) throw new Error(report.error.code);
    const seen: string[] = [];
    const { lines } = lackingLines(report, {
      ...options,
      amountText: (a, measure) => {
        seen.push(`${a.value.toFixed(2)} ${a.unit} ${measure ?? '-'}`);
        return 'x';
      },
      dish: 'shipped:example-frame',
    });
    expect(seen).toEqual(['29.57 ml tbsp', '300.00 g -']);
    expect(lines[0]?.origins).toEqual([
      { kind: 'recipe', app: 'culina', title: 'Example frame', dish: 'shipped:example-frame' },
    ]);
  });

  test('free names become list input only when asked: no id, no amount, the dish’s origin', () => {
    expect(freeLines(['Masa harina'], { title: 'Example frame', dish: 'shipped:x' })).toEqual([
      {
        name: 'Masa harina',
        priority: 'soon',
        origins: [{ kind: 'recipe', app: 'culina', title: 'Example frame', dish: 'shipped:x' }],
      },
    ]);
  });

  test('a German cook gets the names the app gives, and the free names in German', () => {
    const report = classicReport({
      classic: frame(),
      portions: 4,
      lang: 'de',
      ingredients,
      stock: [],
      today: '2026-11-24',
    });
    if (!report.ok) throw new Error(report.error.code);
    expect(lackingLines(report, { ...options, nameOf: (r) => `${r.id} (de)` }).free).toEqual([
      'Masa harina (de)',
    ]);
  });
});

describe('lackingLines on an own dish', () => {
  const input: MakeableInput = {
    ingredients,
    components: [
      {
        id: 'c-dough',
        version: { family: 'c-dough', date: '2026-11-01' },
        name: 'Dough',
        lines: [
          { ref: { kind: 'ingredient', id: 'i-flour' }, amount: { value: 100, unit: 'g' } },
          { ref: { kind: 'ingredient', id: 'i-butter' }, amount: { value: 50, unit: 'g' } },
        ],
      },
    ],
    dishes: [
      {
        id: 'd-pie',
        version: { family: 'd-pie', date: '2026-11-01' },
        name: 'Pie',
        slots: [
          { role: 'starch', ref: { kind: 'component', id: 'c-dough' } },
          {
            role: 'main',
            ref: { kind: 'ingredient', id: 'i-butter' },
            amount: { value: 30, unit: 'g' },
          },
          {
            role: 'garnish',
            ref: { kind: 'ingredient', id: 'i-butter' },
            amount: { value: 1, unit: 'tbsp' },
          },
        ],
      },
    ],
    stock: [],
    today: '2026-11-24',
  };

  test('a component that cannot be made gives its lines; one ingredient in two lines is one line with the amounts added up per unit', () => {
    const report = dishReport(input, 'd-pie');
    if (!report.ok) throw new Error(report.error.code);
    const { lines } = lackingLines(report, options);
    expect(lines.map((l) => [l.ingredientId, l.amount])).toEqual([
      ['i-flour', '100 g'],
      ['i-butter', '80 g + 1 tbsp'],
    ]);
    expect(lines[0]?.origins).toEqual([{ kind: 'recipe', app: 'culina', title: 'Pie' }]);
  });

  test('a dish that is not there is said so', () => {
    expect(dishReport(input, 'nothing')).toEqual({ ok: false, error: { code: 'unknown-dish' } });
  });
});
