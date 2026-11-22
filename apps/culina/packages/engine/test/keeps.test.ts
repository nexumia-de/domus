// Meal prep (docs/data-model.md, "Component", `keeps`; "Stock item", `storage`): a component says
// how long it keeps per storage place, a stock item says where it lies, and the use-by rules read
// both. What held for ingredients before still holds.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { shelfLifeApplies, stockExpiry, useBySuggestions } from '../src/index';
import type { KeepEntry, ShelfLifeEntry } from '../src/index';
import { stockValidator, validators } from './validators';

const example = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.json`, import.meta.url)),
      'utf8',
    ),
  ) as T;

/** A component's entries as the stock rules read them: place and days, no state. */
const KEEPS: KeepEntry[] = [
  { storage: 'fridge', days: 3, source: 'user' },
  { storage: 'freezer', days: 90, source: 'user', note: 'in portions' },
];
const shelf: ShelfLifeEntry[] = KEEPS.map(({ storage, days }) => ({ storage, days }));
const INGREDIENT: ShelfLifeEntry[] = [
  { state: 'cooked', storage: 'fridge', days: 2 },
  { state: 'raw', storage: 'fridge', days: 5 },
];

describe('which shelf life applies', () => {
  test('an entry without a state applies in any state; an entry with one only in that state', () => {
    expect(shelfLifeApplies({ storage: 'fridge', days: 3 }, {})).toBe(true);
    expect(shelfLifeApplies({ storage: 'fridge', days: 3 }, { state: 'cooked' })).toBe(true);
    expect(shelfLifeApplies({ state: 'raw', storage: 'fridge', days: 5 }, {})).toBe(false);
    expect(shelfLifeApplies({ state: 'raw', storage: 'fridge', days: 5 }, { state: 'raw' })).toBe(
      true,
    );
  });
  test('an item that says where it lies takes the shelf life of that place only', () => {
    expect(shelfLifeApplies({ storage: 'freezer', days: 90 }, { storage: 'fridge' })).toBe(false);
    expect(shelfLifeApplies({ storage: 'freezer', days: 90 }, { storage: 'freezer' })).toBe(true);
  });
});

describe('a made component in stock', () => {
  test('one suggestion per place it keeps in, shortest first, without a state on the item', () => {
    expect(useBySuggestions({ preparedOn: '2026-11-20' }, shelf)).toEqual({
      ok: true,
      suggestions: [
        { storage: 'fridge', days: 3, useBy: '2026-11-23' },
        { storage: 'freezer', days: 90, useBy: '2027-02-18' },
      ],
    });
  });
  test('with its place, only that place is offered and the date is derived', () => {
    expect(useBySuggestions({ preparedOn: '2026-11-20', storage: 'freezer' }, shelf)).toEqual({
      ok: true,
      suggestions: [{ storage: 'freezer', days: 90, useBy: '2027-02-18' }],
    });
    expect(
      stockExpiry({ preparedOn: '2026-11-20', storage: 'fridge' }, '2026-11-22', shelf),
    ).toEqual({
      ok: true,
      status: 'use-soon',
      useBy: '2026-11-23',
      daysLeft: 1,
      basis: 'shelf-life',
    });
    expect(
      stockExpiry({ preparedOn: '2026-11-20', storage: 'fridge' }, '2026-11-25', shelf),
    ).toMatchObject({ status: 'past', daysLeft: -2 });
  });
  test('without its place two values apply, so no date is derived', () => {
    expect(stockExpiry({ preparedOn: '2026-11-20' }, '2026-11-22', shelf)).toEqual({
      ok: true,
      status: 'none',
    });
  });
  test('a place the component has no entry for gives nothing', () => {
    expect(useBySuggestions({ preparedOn: '2026-11-20', storage: 'pantry' }, shelf)).toEqual({
      ok: true,
      suggestions: [],
    });
    expect(
      stockExpiry({ preparedOn: '2026-11-20', storage: 'pantry' }, '2026-11-22', shelf),
    ).toEqual({ ok: true, status: 'none' });
  });
  test('an entered use-by date still wins over the recorded shelf life', () => {
    expect(
      stockExpiry(
        { preparedOn: '2026-11-20', storage: 'fridge', useBy: '2026-11-21' },
        '2026-11-21',
        shelf,
      ),
    ).toMatchObject({ basis: 'entered', daysLeft: 0 });
  });
});

describe('an ingredient in stock, as before', () => {
  test('without a state nothing is offered or derived', () => {
    expect(useBySuggestions({ preparedOn: '2026-11-20' }, INGREDIENT)).toEqual({
      ok: true,
      suggestions: [],
    });
    expect(stockExpiry({ preparedOn: '2026-11-20' }, '2026-11-21', INGREDIENT)).toEqual({
      ok: true,
      status: 'none',
    });
  });
  test('with its state the value of that state is taken', () => {
    expect(
      useBySuggestions({ preparedOn: '2026-11-20', state: 'cooked' }, INGREDIENT).ok &&
        useBySuggestions({ preparedOn: '2026-11-20', state: 'cooked' }, INGREDIENT),
    ).toEqual({ ok: true, suggestions: [{ storage: 'fridge', days: 2, useBy: '2026-11-22' }] });
    expect(
      stockExpiry({ preparedOn: '2026-11-20', state: 'raw' }, '2026-11-21', INGREDIENT),
    ).toMatchObject({ basis: 'shelf-life', useBy: '2026-11-25' });
  });
  test('without a date of preparation there is nothing to count from', () => {
    expect(useBySuggestions({ state: 'cooked' }, INGREDIENT)).toEqual({
      ok: true,
      suggestions: [],
    });
  });
});

describe('the schemas', () => {
  test('a component may say how it keeps, each entry with place, days and source', () => {
    const component = example<Record<string, unknown>>('component.valid');
    expect(validators.components({ ...component, keeps: KEEPS })).toBe(true);
    expect(validators.components({ ...component, keeps: [{ storage: 'fridge', days: 3 }] })).toBe(
      false,
    );
    expect(
      validators.components({
        ...component,
        keeps: [{ storage: 'cellar', days: 3, source: 'user' }],
      }),
    ).toBe(false);
    expect(
      validators.components({
        ...component,
        keeps: [{ storage: 'fridge', days: -1, source: 'user' }],
      }),
    ).toBe(false);
  });
  test('a stock item may say where it lies', () => {
    const item = example<Record<string, unknown>>('stock.valid');
    expect(stockValidator({ ...item, storage: 'freezer' })).toBe(true);
    expect(stockValidator({ ...item, storage: 'cellar' })).toBe(false);
  });
});
