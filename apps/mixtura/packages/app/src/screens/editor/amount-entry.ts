// Reads an amount as a bartender types it (`3/4 oz`, `1½`, `45ml`, `2
// dashes`, `1-2 dashes`, `a splash`) with the engine's grammar, plus the
// unit selector as the fallback for a bare number (docs/units.md#parsing-grammar).
// Pure; what is understood is shown under the field by the caller.

import { isEstimatedUnit, parseAmount, toBase, UNITS, type UnitId } from '@mixtura/engine';
import { amountText } from '../spec/format';
import { MAX_AMOUNT, MIN_AMOUNT } from '../spec/swap-state';
import { editorStrings as t } from './strings';

export interface UnitChoice {
  id: string;
  /** The short symbol shown in the selector. */
  label: string;
}

/** Every unit of the table in the order of the table, with its first symbol. */
export const UNIT_CHOICES: readonly UnitChoice[] = UNITS.map((u) => ({
  id: u.id,
  label: u.symbols[0] ?? u.id,
}));

const symbolOf = new Map<string, string>(UNIT_CHOICES.map((u) => [u.id, u.label]));

const NUMBER_PART = /^[\d.,\s/½¼¾⅓⅔⅛⅜⅝⅞–-]+/;

export type AmountRead =
  | { ok: true; amount: number; amountMax?: number; unit: string; hint: string }
  | { ok: false; message: string };

const trimNumber = (n: number): string => String(Number(n.toFixed(4)));

/** The text of a stored amount, in its own unit: `22.5 ml`, `0.75 oz`, `1–2 dash`. */
export function storedText(line: { amount: number; amountMax?: number; unit: string }): string {
  if (line.unit === 'top') return '';
  const symbol = symbolOf.get(line.unit) ?? line.unit;
  const low = trimNumber(line.amount);
  const range =
    line.amountMax !== undefined && line.amountMax !== line.amount
      ? `${low}–${trimNumber(line.amountMax)}`
      : low;
  return `${range} ${symbol}`;
}

/** The number part of an amount text, without its unit. */
export function numberPart(text: string): string {
  return NUMBER_PART.exec(text.trim())?.[0].trim() ?? '';
}

/** The text after the unit selector changed: the number stays, the unit is the chosen one. */
export function withUnit(text: string, unit: string): string {
  const number = numberPart(text);
  if (number === '') return '';
  const symbol = symbolOf.get(unit);
  return symbol ? `${number} ${symbol}` : number;
}

function one(text: string, fallback: string, ounce: 'us' | 'imperial') {
  const parsed = parseAmount(text, { ounce });
  if (parsed.ok) return parsed;
  if (parsed.error.code === 'no_unit' && fallback !== '' && fallback !== 'top') {
    const bare = parseAmount(`${text} ml`, { ounce });
    if (bare.ok)
      return { ok: true as const, value: { value: bare.value.value, unit: fallback as UnitId } };
  }
  return parsed;
}

function hintOf(amount: number, unit: string): string {
  const base = toBase({ value: amount, unit: unit as UnitId });
  if (!base.ok) return t.understoodCounted(`${trimNumber(amount)} ${symbolOf.get(unit) ?? unit}`);
  const shown = amountText(
    { amount: base.value.value, unit: base.value.kind === 'mass' ? 'g' : 'ml' },
    'metric',
  );
  return isEstimatedUnit(unit as UnitId) ? t.understoodAbout(shown) : t.understood(shown);
}

/**
 * Reads the amount field. A bare number takes the unit of the selector; a
 * unit in the text wins. A range (`1-2 dashes`) gives `amountMax`. Zero,
 * negative and absurd amounts are refused with the reason.
 */
export function readAmount(
  text: string,
  fallbackUnit: string,
  ounce: 'us' | 'imperial' = 'us',
): AmountRead {
  const typed = text
    .trim()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/^(?:an?|one)\s+(?=[a-z])/i, '1 ');
  if (typed === '') return { ok: false, message: t.needAmount };
  const range = /^(.+?)\s*[–-]\s*(.+)$/.exec(typed);
  if (range && NUMBER_PART.test(range[1] ?? '') && /^[\d.\s/½¼¾⅓⅔⅛⅜⅝⅞]+$/.test(range[1] ?? '')) {
    const high = one(range[2] as string, fallbackUnit, ounce);
    const low = parseAmount(`${range[1]} ml`, { ounce });
    if (!high.ok) return { ok: false, message: high.error.message };
    if (!low.ok) return { ok: false, message: low.error.message };
    const [a, b] = [low.value.value, high.value.value];
    if (!(a < b)) return { ok: false, message: t.rangeOrder };
    if (a < MIN_AMOUNT || b > MAX_AMOUNT) {
      return { ok: false, message: t.amountRange(MIN_AMOUNT, MAX_AMOUNT) };
    }
    return {
      ok: true,
      amount: a,
      amountMax: b,
      unit: high.value.unit,
      hint: hintOf(a, high.value.unit),
    };
  }
  const parsed = one(typed, fallbackUnit, ounce);
  if (!parsed.ok) return { ok: false, message: parsed.error.message };
  const { value, unit } = parsed.value;
  if (unit === 'top') return { ok: false, message: t.needAmount };
  if (!(value >= MIN_AMOUNT && value <= MAX_AMOUNT)) {
    return { ok: false, message: t.amountRange(MIN_AMOUNT, MAX_AMOUNT) };
  }
  return { ok: true, amount: value, unit, hint: hintOf(value, unit) };
}
