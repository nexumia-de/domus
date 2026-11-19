import { describe, expect, test } from 'vitest';
import { bakersPercent, fromBakersPercent, hydration } from '../src/index';

const dough = [
  { id: 'white', g: 650, role: 'flour' },
  { id: 'rye', g: 350, role: 'flour' },
  { id: 'water', g: 720, role: 'water' },
  { id: 'salt', g: 20, role: 'salt' },
];

describe("baker's percentages", () => {
  test('grams to percentages to grams returns the grams', () => {
    const p = bakersPercent(dough);
    if (!p.ok) throw new Error('percent');
    const formula = dough.map((l) => ({ id: l.id, pct: p.pct[l.id] as number, role: l.role }));
    const back = fromBakersPercent(formula, { doughG: p.doughG });
    if (!back.ok) throw new Error('back');
    for (const l of dough) expect(back.g[l.id]).toBeCloseTo(l.g, 9);
    expect(back.flourG).toBeCloseTo(1000, 9);
    const byFlour = fromBakersPercent(formula, { flourG: p.flourG });
    expect(byFlour.ok && byFlour.doughG).toBeCloseTo(p.doughG, 9);
  });

  test('a custom base role', () => {
    const p = bakersPercent(
      [
        { id: 'x', g: 50, role: 'base' },
        { id: 'y', g: 25 },
      ],
      { baseRole: 'base' },
    );
    expect(p.ok && p.pct).toEqual({ x: 100, y: 50 });
  });

  test('errors', () => {
    expect(bakersPercent([{ id: 'w', g: 5 }])).toEqual({ ok: false, error: { code: 'no-base' } });
    expect(bakersPercent([{ id: 'f', g: 0, role: 'flour' }])).toEqual({
      ok: false,
      error: { code: 'no-base' },
    });
    expect(bakersPercent([{ id: 'f', g: -1, role: 'flour' }])).toEqual({
      ok: false,
      error: { code: 'invalid-value', lineId: 'f' },
    });
    expect(bakersPercent([{ id: 'f', g: NaN, role: 'flour' }]).ok).toBe(false);
    expect(
      bakersPercent([
        { id: 'f', g: 1, role: 'flour' },
        { id: 'f', g: 1 },
      ]),
    ).toEqual({ ok: false, error: { code: 'duplicate-id', lineId: 'f' } });
    const f = [{ id: 'f', pct: 99.9, role: 'flour' }];
    expect(fromBakersPercent(f, { doughG: 100 })).toEqual({
      ok: false,
      error: { code: 'base-not-100', basePct: 99.9 },
    });
    expect(fromBakersPercent([{ id: 'w', pct: 70 }], { doughG: 100 })).toEqual({
      ok: false,
      error: { code: 'no-base' },
    });
    expect(fromBakersPercent([{ id: 'f', pct: 100, role: 'flour' }], { doughG: 0 })).toEqual({
      ok: false,
      error: { code: 'invalid-target' },
    });
    expect(fromBakersPercent([{ id: 'f', pct: 100, role: 'flour' }], {} as never)).toEqual({
      ok: false,
      error: { code: 'invalid-target' },
    });
    expect(
      fromBakersPercent(
        [
          { id: 'f', pct: 100, role: 'flour' },
          { id: 'w', pct: NaN },
        ],
        { doughG: 1 },
      ).ok,
    ).toBe(false);
  });

  test('base lines may sum to 100 within 1e-9', () => {
    const f = [
      { id: 'a', pct: 33.3333333333, role: 'flour' },
      { id: 'b', pct: 66.6666666667, role: 'flour' },
    ];
    expect(fromBakersPercent(f, { flourG: 300 }).ok).toBe(true);
  });
});

describe('hydration', () => {
  test('water over flour, other roles on neither side', () => {
    const h = hydration(dough);
    expect(h).toEqual({ ok: true, hydrationPct: 72, flourG: 1000, waterG: 720, notCounted: [] });
  });

  test('composition replaces the line mass; a component without it is listed', () => {
    const h = hydration([
      { id: 'flour', g: 400, role: 'flour' },
      {
        id: 'biga',
        g: 300,
        role: 'flour',
        component: true,
        composition: { flourG: 200, waterG: 100 },
      },
      { id: 'levain', g: 50, component: true },
    ]);
    expect(h).toEqual({
      ok: true,
      hydrationPct: (100 * 100) / 600,
      flourG: 600,
      waterG: 100,
      notCounted: ['levain'],
    });
  });

  test('errors', () => {
    expect(hydration([{ id: 'w', g: 10, role: 'water' }])).toEqual({
      ok: false,
      error: { code: 'no-base' },
    });
    expect(hydration([{ id: 'f', g: -1, role: 'flour' }])).toEqual({
      ok: false,
      error: { code: 'invalid-value', lineId: 'f' },
    });
    expect(hydration([{ id: 'p', g: 1, composition: { flourG: NaN, waterG: 1 } }]).ok).toBe(false);
  });
});
