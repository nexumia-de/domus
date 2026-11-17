// Runs every vector file in vectors/amounts/ against the amounts module and
// checks the round trip format -> parse over the parse vector inputs.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  convert,
  formatAmount,
  formatAmountDetailed,
  parseAmount,
  scale,
  toBase,
  toGrams,
  toMl,
  UNITS,
} from '../src/index';
import type { Amount, DisplaySystem, Result, UnitId, UnitOverrides } from '../src/index';
import { validate } from './helpers/json-schema';

const dir = fileURLToPath(new URL('../vectors/amounts/', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(`${dir}${name}`, 'utf8'));
const schema = read('amounts.schema.json');
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'amounts.schema.json');

type Case = { name: string; input: Record<string, unknown>; expected: Record<string, unknown> };
type Vector = { id: string; kind: string; cases: Case[]; tolerance: number };

function check(result: Result<unknown>, expected: Record<string, unknown>, tol: number) {
  if ('error' in expected) {
    expect(result.ok ? 'ok' : result.error.code).toBe(expected.error);
    return;
  }
  expect(result.ok, result.ok ? '' : result.error.message).toBe(true);
  if (!result.ok) return;
  const got = result.value as Record<string, unknown> | number | string;
  for (const [key, want] of Object.entries(expected)) {
    const have = typeof got === 'object' ? got[key] : got;
    if (typeof want === 'number')
      expect(Math.abs((have as number) - want)).toBeLessThanOrEqual(tol);
    else expect(have).toBe(want);
  }
}

function run(kind: string, c: Case): Result<unknown> {
  const i = c.input;
  const amount: Amount = { value: i.value as number, unit: i.unit as UnitId };
  const overrides = i.overrides as UnitOverrides | undefined;
  switch (kind) {
    case 'parse':
      return parseAmount(i.text as string, i.options as object | undefined);
    case 'scale':
      return scale(amount, i.factor as number);
    case 'format':
      return formatAmount(amount, {
        system: i.system as DisplaySystem | undefined,
        entered: i.entered as string | undefined,
      });
    default:
      switch (i.op) {
        case 'base': {
          const r = toBase(amount, overrides);
          return r.ok ? { ok: true, value: { base: r.value.value, kind: r.value.kind } } : r;
        }
        case 'ml': {
          const r = toMl(amount, overrides);
          return r.ok ? { ok: true, value: { base: r.value } } : r;
        }
        case 'grams': {
          const r = toGrams(amount, overrides);
          return r.ok ? { ok: true, value: { base: r.value } } : r;
        }
        default:
          return convert(amount, i.to as UnitId, overrides);
      }
  }
}

describe.each(files)('%s', (file) => {
  const vector = read(file) as Vector;
  test('validates against the schema and its id is the file name', () => {
    expect(validate(schema, vector as never)).toEqual([]);
    expect(vector.id).toBe(file.replace(/\.json$/, ''));
  });
  test.each(vector.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    check(run(vector.kind, c), c.expected, vector.tolerance);
  });
});

test('every unit of the table has a conversion vector', () => {
  const names = new Set(
    (read('convert-to-base.json') as Vector).cases.map((c) => `${c.input.unit}`),
  );
  for (const u of UNITS) expect(names.has(u.id), u.id).toBe(true);
});

const nativeSystem: Record<string, DisplaySystem> = {
  oz_us: 'us',
  oz_imp: 'imperial',
  oz_mass: 'us',
};

describe('round trip: format then parse returns the amount within the rounding step', () => {
  const accepted = [
    ...read('parse-accepted-grammar.json').cases,
    ...read('parse-accepted-variants.json').cases,
  ];
  test.each(accepted.map((c: Case) => [c.name, c] as const))('%s', (_n, c) => {
    const first = parseAmount(c.input.text as string);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const system = nativeSystem[first.value.unit] ?? 'metric';
    const f = formatAmountDetailed(first.value, { system });
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    const again = parseAmount(f.value.text);
    expect(again.ok, f.value.text).toBe(true);
    if (!again.ok) return;
    expect(again.value.unit).toBe(f.value.shown.unit);
    expect(again.value.value).toBeCloseTo(f.value.shown.value, 9);
    expect(Math.abs(again.value.value - first.value.value)).toBeLessThanOrEqual(
      f.value.step / 2 + 1e-9,
    );
  });
});

test('metric and US display of one amount leave the stored amount unchanged', () => {
  const stored: Amount = { value: 1.5, unit: 'oz_us' };
  const before = JSON.stringify(stored);
  expect(formatAmount(stored, { system: 'metric' })).toEqual({ ok: true, value: '44 ml' });
  expect(formatAmount(stored, { system: 'us' })).toEqual({ ok: true, value: '1½ oz' });
  expect(JSON.stringify(stored)).toBe(before);
});
