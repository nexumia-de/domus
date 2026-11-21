// Amounts a cook actually writes (docs/behaviour.md, "Amounts as a cook writes them"): one line
// that cannot be weighed leaves the rest of its component whole and its name a name; a dish and its
// cook screen scale a component without a weighed output by the same rule; pieces and spoons are
// shown as a cook writes them; every unit has a name. A notebook built in memory: no store, no
// browser, the app language English (the German names are checked in strings-de.test.ts).
import { expect, test } from 'vitest';
import { amountText, lineAmountText } from '../src/classics/amounts';
import { yieldView } from '../src/components/figures';
import { lineRows } from '../src/components/lines';
import { dishParts, ownCookView, stepLines } from '../src/components/steps-view';
import { dishRaw } from '../src/dishes/raw';
import { slotRows } from '../src/dishes/slots';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord, DishRecord } from '../src/records';
import { piecesText, unitName, unitOptions, writtenAmount } from '../src/shared/units';
import { stringsDe, stringsEn } from '../src/strings';
import { AMOUNT_UNITS } from '../src/editor/units';

const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const version = (id: string) => ({ family: id, date: '2026-11-21' });

// The tester's sauce: the onion is the example onion, which has no piece weight.
const sauce: ComponentRecord = {
  id: 'sauce',
  name: 'Quick tomato sauce',
  lines: [
    { key: 'tom', ref: ing('fdc-group-tomatoes'), amount: { value: 400, unit: 'g' } },
    { key: 'oni', ref: ing('onion'), amount: { value: 1, unit: 'count' } },
    { key: 'but', ref: ing('butter'), amount: { value: 30, unit: 'g' } },
    { key: 'sal', ref: ing('salt'), amount: { value: 18, unit: 'g' } },
  ],
  steps: [
    { technique: 'sweat', uses: ['oni', 'but'] },
    { technique: 'simmer', uses: ['tom'] },
    { action: 'season', uses: ['sal'] },
  ],
  version: version('sauce'),
};
const nb = buildNotebook(
  [
    { id: 'fdc-group-tomatoes', name: 'Tomatoes' },
    { id: 'onion', name: 'Onion' },
    { id: 'butter', name: 'Butter' },
    { id: 'salt', name: 'Salt' },
    { id: 'potato', name: 'Potato' },
  ],
  [sauce],
);
const plate: DishRecord = {
  id: 'plate',
  name: 'Potatoes with sauce',
  slots: [
    {
      key: 's1',
      role: 'sauce',
      ref: { kind: 'component', id: 'sauce' },
      amount: { value: 112, unit: 'g' },
    },
    { key: 's2', role: 'main', ref: ing('potato'), amount: { value: 250, unit: 'g' } },
  ],
  version: version('plate'),
};

test('A: one line without a piece weight is one row with its note; the others keep their grams', () => {
  const view = lineRows(nb, sauce);
  expect(view.ok).toBe(true);
  if (!view.ok) return;
  expect(view.rows.map((r) => [r.name, r.g])).toEqual([
    ['Tomatoes', 400],
    ['Onion', undefined],
    ['Butter', 30],
    ['Salt', 18],
  ]);
  expect(view.rows[1]?.unconverted).toEqual({
    written: { value: 1, unit: 'count' },
    lacks: 'needs-unit-weight',
  });
  const figures = yieldView(nb, sauce);
  expect(figures.ok && [figures.inputG, figures.unweighable]).toEqual([448, true]);
});

test('A: the steps name their lines by name, never by id, and the cook screen has the amounts', () => {
  expect(stepLines(nb, sauce, 'en', [])).toEqual([
    'sweat: Onion, Butter',
    'simmer: Tomatoes',
    'Season: Salt',
  ]);
  const cook = ownCookView(nb, sauce, 'en', [], new Set());
  expect(cook[0]?.lines.map((l) => [l.name, l.amount])).toEqual([
    ['Onion', '1 pcs'],
    ['Butter', '30 g'],
  ]);
  expect(cook[1]?.lines.map((l) => [l.name, l.amount])).toEqual([['Tomatoes', '400 g']]);
  expect(cook[0]?.lines[0]?.note).toBe(stringsEn.notebook.lacks['needs-unit-weight']);
});

test('B: the dish total list and the cook screen scale an unweighed component by one rule', () => {
  const rows = slotRows(nb, plate, 2);
  const raw = dishRaw(nb, rows);
  // 224 g of a sauce whose run weighs 448 g (what goes in, the onion not counted): half a run.
  expect(raw.skipped).toEqual([]);
  expect(raw.unweighed).toEqual(['Quick tomato sauce']);
  expect(raw.rows.map((r) => [r.name, r.g])).toEqual([
    ['Tomatoes', 200],
    ['Butter', 15],
    ['Salt', 9],
    ['Potato', 500],
  ]);
  expect(raw.unconverted).toEqual([{ name: 'Onion', where: 'Quick tomato sauce' }]);
  const parts = dishParts(nb, plate, 2, { fromStock: (n) => n });
  expect(parts[0]?.lines.map((l) => [l.name, l.amount])).toEqual([
    ['Tomatoes', '200 g'],
    ['Onion', '½ pcs'],
    ['Butter', '15 g'],
    ['Salt', '9 g'],
  ]);
});

test('C: pieces to a whole or a half with the exact count beside; spoons as the spoon', () => {
  expect(piecesText(5.333333333)).toBe('5½ pcs (5.33)');
  expect(piecesText(4)).toBe('4 pcs');
  expect(piecesText(0.2)).toBe('½ pcs (0.2)');
  expect(amountText({ value: 7.393382391, unit: 'ml' }, 'tbsp')).toBe('½ tbsp');
  expect(amountText({ value: 236.5882365, unit: 'ml' }, 'cup')).toBe('1 cup');
  expect(amountText({ value: 1.642973864583, unit: 'ml' }, 'tsp')).toBe('¼ tsp (1.6 ml)');
  // Without a measure millilitres stay millilitres, and grams stay grams.
  expect(amountText({ value: 237, unit: 'ml' })).toBe('237 ml');
  expect(amountText({ value: 12.34, unit: 'g' })).toBe('12 g');
  expect(
    lineAmountText(
      { amount: { value: 22.18, unit: 'ml' }, measure: 'tbsp' },
      {
        index: 0,
        min: { value: 14.78676478125, unit: 'ml' },
        max: { value: 29.5735295625, unit: 'ml' },
      },
    ),
  ).toBe(stringsEn.classics.amountRange('1 tbsp', '2 tbsp'));
});

test('D: every unit the editors offer has a name in both languages, from one table', () => {
  for (const unit of [...AMOUNT_UNITS, 'percent'] as const) {
    expect(stringsEn.units[unit], unit).toBeTruthy();
    expect(stringsDe.units[unit], unit).toBeTruthy();
  }
  expect(stringsDe.units.tbsp).toBe('EL');
  expect(stringsDe.units.tsp).toBe('TL');
  expect(stringsDe.units.cup).toBe('Tasse');
  expect(stringsDe.units.count).toBe('Stück');
  expect(Object.values(stringsDe.units).some((name) => name.startsWith('imp-'))).toBe(false);
  expect(unitName('imp-pint')).toBe('pint (UK)');
  expect(unitOptions(['g', 'count'])).toEqual([
    { value: 'g', label: 'g' },
    { value: 'count', label: 'pcs' },
  ]);
  expect(writtenAmount({ value: 1, unit: 'count' })).toBe('1 pcs');
});
