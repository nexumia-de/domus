import { componentLineGrams } from '@culina/engine';
import { expect, test } from 'vitest';
import { chooseReference, referenceIndex, switchEntry } from '../src/editor/component-convert';
import {
  engineLine,
  formFromRecord,
  formToRecord,
  newComponentForm,
  problemsOf,
  type ComponentForm,
} from '../src/editor/component-form';
import { inCycle, wouldCycle } from '../src/editor/cycle';
import { lineFigures } from '../src/editor/figures';
import { formFromPrefill } from '../src/editor/prefill';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord } from '../src/records';
import { must } from './must';

const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const dough = (): ComponentForm => ({
  ...newComponentForm('u-1'),
  name: 'Dough',
  percentBase: 'flour',
  lines: [
    { ref: ing('flour'), amount: '500', unit: 'g', role: 'flour' },
    { ref: ing('water'), amount: '300', unit: 'g' },
    { ref: ing('salt'), amount: '10', unit: 'g' },
    { ref: ing('pepper'), amount: '', unit: 'g' },
  ],
});
const nb = buildNotebook([], []);
const gramsOf = (form: ComponentForm): number[] => {
  const r = componentLineGrams({
    id: form.id,
    percentBase: 'flour',
    lines: form.lines.map(engineLine),
  });
  if (!r.ok) throw new Error(r.error.code);
  return r.lines.map((l) => l.g);
};

test('weight to percent and back: the engine converts, the grams never change', () => {
  const start = dough();
  const percent = switchEntry(start, 'percent', nb.facts);
  expect(percent.ok).toBe(true);
  const p = must(percent.ok ? percent.form : undefined);
  expect(p.entry).toBe('percent');
  expect(p.lines.map((l) => [l.amount, l.unit])).toEqual([
    ['500', 'g'],
    ['60', 'percent'],
    ['2', 'percent'],
    ['', 'g'],
  ]);
  expect(gramsOf(p)).toEqual(gramsOf(start));
  const back = switchEntry(p, 'weight', nb.facts);
  const w = must(back.ok ? back.form : undefined);
  expect(w.lines.map((l) => l.amount)).toEqual(['500', '300', '10', '']);
  expect(w.lines.map((l) => l.unit)).toEqual(['g', 'g', 'g', 'g']);
});

test('percent entry without a reference only changes the mode; choosing one converts', () => {
  const start = dough();
  delete start.percentBase;
  for (const line of start.lines) delete line.role;
  const pending = switchEntry(start, 'percent', nb.facts);
  const p = must(pending.ok ? pending.form : undefined);
  expect(p.entry).toBe('percent');
  expect(p.lines.every((l) => l.unit === 'g')).toBe(true);
  expect(referenceIndex(p)).toBe(-1);
  const chosen = chooseReference(p, 0, nb.facts, () => 'flour');
  const c = must(chosen.ok ? chosen.form : undefined);
  expect(c.percentBase).toBe('flour');
  expect(c.lines.map((l) => [l.amount, l.unit])).toEqual([
    ['500', 'g'],
    ['60', 'percent'],
    ['2', 'percent'],
    ['', 'g'],
  ]);
  expect(referenceIndex(c)).toBe(0);
});

test('a new reference in percent entry converts every line anew, grams unchanged', () => {
  const p = must(
    (() => {
      const r = switchEntry(dough(), 'percent', nb.facts);
      return r.ok ? r.form : undefined;
    })(),
  );
  const before = gramsOf(p);
  const chosen = chooseReference(p, 1, nb.facts, () => undefined);
  const c = must(chosen.ok ? chosen.form : undefined);
  expect(c.percentBase).toBe('base');
  expect(c.lines[1]?.unit).toBe('g');
  expect(c.lines[0]?.unit).toBe('percent');
  const grams = componentLineGrams({
    id: 'x',
    percentBase: 'base',
    lines: c.lines.map(engineLine),
  });
  expect(grams.ok && grams.lines.map((l) => Math.round(l.g * 1e6) / 1e6)).toEqual(
    before.slice(0, 3),
  );
});

test('a line the engine cannot convert is reported and nothing changes', () => {
  const form = dough();
  form.lines[1] = { ref: ing('water'), amount: '1', unit: 'cup' };
  const result = switchEntry(form, 'percent', nb.facts);
  expect(result).toEqual({ ok: false, reason: 'cannot-convert' });
});

test('live figures come from the engine: grams of a percent line, percent of a weight line', () => {
  const p = must(
    (() => {
      const r = switchEntry(dough(), 'percent', nb.facts);
      return r.ok ? r.form : undefined;
    })(),
  );
  const figures = lineFigures(nb, p);
  expect(figures[1]?.g).toBeCloseTo(300, 9);
  expect(figures[2]?.g).toBeCloseTo(10, 9);
  expect(figures[3]).toEqual({});
  const w = lineFigures(nb, dough());
  expect(w[1]?.percent).toBeCloseTo(60, 9);
});

test('structural problems: name, lines, ingredient, amount, yield; amounts that are zero or negative', () => {
  const form = newComponentForm('u-1');
  form.lines = [{ amount: '-5', unit: 'g' }];
  form.yieldAmount = '0';
  const codes = problemsOf(form).map((p) => p.code);
  expect(codes).toEqual(['name', 'ingredient', 'amount', 'yield']);
  form.lines = [];
  expect(problemsOf(form).map((p) => p.code)).toContain('no-lines');
  expect(formToRecord(form, '2026-11-18').ok).toBe(false);
});

test('a form becomes a record that keeps what was entered; a new one is its own family', () => {
  const form = dough();
  form.role = 'starch';
  form.yieldAmount = '800';
  form.method = 'Mix\n\n Rest ';
  const done = formToRecord(form, '2026-11-18');
  const r = must(done.ok ? done.record : undefined);
  expect(r.version).toEqual({ family: 'u-1', date: '2026-11-18' });
  expect(r.percentBase).toBe('flour');
  expect(r.yield).toEqual({ amount: { value: 800, unit: 'g' }, source: 'user' });
  expect(r.method).toEqual(['Mix', 'Rest']);
  expect(r.lines[3]).toEqual({ ref: ing('pepper') });
  // Loading it again gives the same values.
  const again = formFromRecord(r);
  expect(again.lines.map((l) => [l.amount, l.unit])).toEqual(
    form.lines.map((l) => [l.amount, l.unit]),
  );
  expect(formToRecord(again, '2030-01-01')).toEqual(done);
});

test('a prefill from the calculator keeps the role of each line and leaves the ingredient to pick', () => {
  const form = formFromPrefill(
    {
      templateId: 'bread',
      baseRole: 'flour',
      lines: [{ role: 'flour', g: 500 }, { role: 'water', g: 333.3333 }, { role: 'salt' }],
    },
    'u-2',
  );
  expect(form.lines.map((l) => [l.role, l.amount, l.ref])).toEqual([
    ['flour', '500', undefined],
    ['water', '333', undefined],
    ['salt', '', undefined],
  ]);
  expect(form.templateId).toBe('bread');
  expect(problemsOf({ ...form, name: 'x' }).filter((p) => p.code === 'ingredient')).toHaveLength(3);
  // Percent entry works at once: the flour line is the reference.
  expect(referenceIndex(form)).toBe(0);
});

const comp = (id: string, ...subs: string[]): ComponentRecord => ({
  id,
  name: id,
  lines: subs.map((s) => ({
    ref: { kind: 'component' as const, id: s },
    amount: { value: 1, unit: 'g' as const },
  })),
  version: { family: id, date: '2026-11-18' },
});

test('a cycle is found directly and through a sub-component; the picker rule agrees', () => {
  const stored = [comp('a', 'b'), comp('b'), comp('c')];
  expect(inCycle(stored, { id: 'b', lines: [{ ref: { kind: 'component', id: 'b' } }] })).toBe(true);
  expect(inCycle(stored, { id: 'b', lines: [{ ref: { kind: 'component', id: 'a' } }] })).toBe(true);
  expect(inCycle(stored, { id: 'b', lines: [{ ref: { kind: 'component', id: 'c' } }] })).toBe(
    false,
  );
  expect(wouldCycle(stored, { id: 'b', lines: [] }, 'b')).toBe(true);
  expect(wouldCycle(stored, { id: 'b', lines: [] }, 'a')).toBe(true);
  expect(wouldCycle(stored, { id: 'b', lines: [] }, 'c')).toBe(false);
  expect(wouldCycle(stored, { id: 'new', lines: [] }, 'a')).toBe(false);
});
