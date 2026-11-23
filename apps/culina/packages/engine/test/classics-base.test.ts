// A base and its alternatives (src/classics/base.ts, docs/decisions/bases-and-pack.md): which
// components the dish uses, which are held as alternatives for a slot, and what the validator and
// the finder make of them. The bases here are invented; no shipped file is read.
import { describe, expect, test } from 'vitest';
import {
  classicsMakeable,
  componentsInDish,
  componentsUsed,
  copyClassic,
  copyClassicComponent,
  isBase,
  slotAlternatives,
  validateClassic,
} from '../src/index';
import type { Classic, ClassicComponent, ClassicSlot } from '../src/index';

const t = (en: string): { en: string; de: string } => ({ en, de: `${en} (de)` });

const component = (id: string, role: string | undefined, ingredient: string): ClassicComponent => ({
  id,
  name: t(id),
  ...(role === undefined ? {} : { role }),
  lines: [{ ref: { kind: 'ingredient', id: ingredient }, amount: { value: 100, unit: 'g' } }],
});

/** An invented frame: a shell and a filling, two fillings held as alternatives, one dressing. */
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
    component('shell', 'starch', 'i-flour'),
    component('beans', 'main', 'i-beans'),
    component('squash', 'main', 'i-squash'),
    {
      ...component('mushrooms', 'main', 'i-mushroom'),
      lines: [
        { ref: { kind: 'component', id: 'dressing' }, amount: { value: 20, unit: 'g' } },
        { ref: { kind: 'ingredient', id: 'i-mushroom' }, amount: { value: 100, unit: 'g' } },
      ],
    },
    component('dressing', 'sauce', 'i-oil'),
  ],
  slots: [
    { role: 'starch', ref: { kind: 'component', id: 'shell' }, amount: { value: 100, unit: 'g' } },
    { role: 'main', ref: { kind: 'component', id: 'beans' }, amount: { value: 100, unit: 'g' } },
  ],
  settled: [],
  check: { method: 'second-reader', note: 'invented' },
  ...over,
});

const ctx = { techniques: [] };
const slot = (c: Classic, i: number): ClassicSlot => {
  const s = c.slots[i];
  if (s === undefined) throw new Error(`no slot ${i}`);
  return s;
};
const codes = (c: Classic): string[] => {
  const r = validateClassic(c, ctx);
  return r.ok ? [] : r.error.findings.map((f) => `${f.code} ${f.value ?? f.path}`);
};

describe('a base', () => {
  test('is marked by kind; a file without kind, or kind dish, is a dish', () => {
    expect(isBase(frame())).toBe(true);
    expect(isBase(frame({ kind: 'dish' }))).toBe(false);
    const plain: Classic = { ...frame() };
    delete plain.kind;
    expect(isBase(plain)).toBe(false);
  });

  test('uses the components a slot reaches; the others of a slot role are its alternatives', () => {
    const f = frame();
    expect([...componentsInDish(f)].sort()).toEqual(['beans', 'shell']);
    expect(slotAlternatives(f, slot(f, 1)).map((c) => c.id)).toEqual(['squash', 'mushrooms']);
    expect(slotAlternatives(f, slot(f, 0))).toEqual([]);
    // The dressing is named by an alternative's line, so it is used.
    expect([...componentsUsed(f)].sort()).toEqual([
      'beans',
      'dressing',
      'mushrooms',
      'shell',
      'squash',
    ]);
  });

  test('a dish has no alternatives, and an ingredient slot has none', () => {
    const dish = frame({ kind: 'dish' });
    expect(slotAlternatives(dish, slot(dish, 1))).toEqual([]);
    const f = frame({
      slots: [...frame().slots, { role: 'acid', ref: { kind: 'ingredient', id: 'i-lime' } }],
    });
    expect(slotAlternatives(f, slot(f, 2))).toEqual([]);
  });

  test('passes the validator; the same file as a dish has three unused components', () => {
    expect(codes(frame())).toEqual([]);
    expect(codes(frame({ kind: 'dish' }))).toEqual([
      'unused-component squash',
      'unused-component mushrooms',
      'unused-component dressing',
    ]);
  });

  test('a component of a base with no slot role, or no role, is unused', () => {
    const extra = frame({
      components: [
        ...(frame().components ?? []),
        component('pickles', 'crunch', 'i-cucumber'),
        component('loose', undefined, 'i-salt'),
      ],
    });
    expect(codes(extra)).toEqual(['unused-component pickles', 'unused-component loose']);
  });

  test('a base with no slot filled by a component is reported', () => {
    const bare = frame({
      components: [],
      slots: [{ role: 'main', ref: { kind: 'ingredient', id: 'i-beans' } }],
    });
    expect(codes(bare)).toEqual(['base-without-component slots']);
  });

  test('the finder asks only for what the dish uses, not for the alternatives', () => {
    const f = frame({
      components: [
        ...(frame().components ?? []).slice(0, 2),
        {
          id: 'odd',
          name: t('odd'),
          role: 'main',
          lines: [{ wanted: t('Odd root'), amount: { value: 1, unit: 'g' } }],
        },
      ],
    });
    expect(codes(f)).toEqual([]);
    const result = classicsMakeable({
      classics: [f],
      ingredients: [{ id: 'i-flour' }, { id: 'i-beans' }],
      stock: [
        { id: 's1', ref: { kind: 'ingredient', id: 'i-flour' } },
        { id: 's2', ref: { kind: 'ingredient', id: 'i-beans' } },
      ],
      today: '2026-11-22',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.candidates[0]?.notInCatalogue).toEqual([]);
  });

  test('a kept base carries its alternatives into the notebook with their role', () => {
    let n = 0;
    const copied = copyClassic(frame(), {
      portions: 2,
      lang: 'en',
      date: '2026-11-22',
      newId: () => `u-${++n}`,
    });
    expect(copied.ok).toBe(true);
    if (copied.ok) {
      expect(copied.components.map((c) => [c.name, c.role])).toEqual([
        ['shell', 'starch'],
        ['beans', 'main'],
        ['squash', 'main'],
        ['mushrooms', 'main'],
        ['dressing', 'sauce'],
      ]);
      expect(copied.dish.slots).toHaveLength(2);
    }
  });
});

describe('one component copied (copyClassicComponent)', () => {
  const options = () => {
    let n = 0;
    return { portions: 2, lang: 'en' as const, date: '2026-11-22', newId: () => `u-${++n}` };
  };

  test('an alternative of a base comes with the component its lines name, ids new, role kept', () => {
    const copied = copyClassicComponent(frame(), 'mushrooms', options());
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    expect(copied.components.map((c) => [c.name, c.role])).toEqual([
      ['mushrooms', 'main'],
      ['dressing', 'sauce'],
    ]);
    const [mushrooms, dressing] = copied.components;
    expect(mushrooms?.lines[0]?.ref).toEqual({ kind: 'component', id: dressing?.id });
    expect(copied.components.every((c) => c.id.startsWith('u-') && c.version.family === c.id)).toBe(
      true,
    );
    // Amounts for 2 of the source's 4 persons, as copyClassic gives them.
    expect(dressing?.lines[0]?.amount).toEqual({ value: 50, unit: 'g' });
    expect(mushrooms?.['x-origin'].classic).toBe('example-frame');
  });

  test('a component without sub-components is copied alone', () => {
    const copied = copyClassicComponent(frame(), 'shell', options());
    expect(copied.ok && copied.components.map((c) => c.name)).toEqual(['shell']);
  });

  test('a wanted line in the component refuses it; one elsewhere in the file does not', () => {
    const wanted: ClassicComponent = {
      id: 'odd',
      name: t('odd'),
      role: 'main',
      lines: [{ wanted: t('Example unknown'), amount: { value: 1, unit: 'g' } }],
    };
    const f = frame({ components: [...(frame().components ?? []), wanted] });
    expect(copyClassicComponent(f, 'odd', options())).toEqual({
      ok: false,
      error: { code: 'wanted-ingredient', wanted: ['Example unknown'] },
    });
    expect(copyClassicComponent(f, 'shell', options()).ok).toBe(true);
  });

  test('an id the file does not have is refused', () => {
    expect(copyClassicComponent(frame(), 'nothing', options())).toEqual({
      ok: false,
      error: { code: 'unknown-component', id: 'nothing' },
    });
  });
});
