// Try a Swap, the state: which line has another ingredient or another amount.
// The whole swap is in the address (`?swap=<line>:<ingredient>:<amount>,...`,
// docs/behaviour.md), so it survives Back and a reload and is shareable; it is
// never stored. Pure functions: the address, the effective lines and the
// amount steps are tested without a browser (docs/screens-browse.md#swap-mode).

import { parseAmount, toBase, UNITS, type UnitId } from '@mixtura/engine';
import type { SpecLine } from '../browse/types';

/** An amount in the unit it was entered in. */
export interface SwapAmount {
  value: number;
  unit: string;
}

/** What differs on one line; an absent part is as in the saved spec. */
export interface LineSwap {
  ingredientId?: string;
  amount?: SwapAmount;
}

/** Swapped lines by position in the spec. Present = swap mode is on, even if nothing changed yet. */
export interface Swap {
  lines: Readonly<Record<number, LineSwap>>;
}

export const noSwap: Swap = { lines: {} };

/** Smallest and largest amount accepted, in the unit entered. */
export const MIN_AMOUNT = 0.01;
export const MAX_AMOUNT = 10000;

const UNIT_IDS = new Set<string>(UNITS.filter((u) => u.id !== 'top').map((u) => u.id));

/** `22.5ml`, `0.75oz_us`, `2dash`: a number and a unit id, nothing that needs escaping. */
const AMOUNT_TOKEN = /^(\d+(?:\.\d+)?)([a-z_]+)$/;

function amountToken(amount: SwapAmount): string {
  return `${Number(amount.value.toFixed(4))}${amount.unit}`;
}

function readAmountToken(token: string): SwapAmount | undefined {
  const m = AMOUNT_TOKEN.exec(token);
  if (!m) return undefined;
  const value = Number(m[1]);
  const unit = m[2] as string;
  return UNIT_IDS.has(unit) && value >= MIN_AMOUNT && value <= MAX_AMOUNT
    ? { value, unit }
    : undefined;
}

/** The swap in an address, or null when the screen is not in swap mode. Unreadable entries are left out. */
export function swapOf(query: URLSearchParams): Swap | null {
  const text = query.get('swap');
  if (text === null) return null;
  const lines: Record<number, LineSwap> = {};
  for (const entry of text.split(',')) {
    const [slot = '', ingredient = '', amount = ''] = entry.split(':');
    const index = Number(slot);
    if (!/^\d+$/.test(slot) || !Number.isSafeInteger(index)) continue;
    const swap: LineSwap = {};
    try {
      if (ingredient !== '') swap.ingredientId = decodeURIComponent(ingredient);
    } catch {
      continue;
    }
    const read = amount === '' ? undefined : readAmountToken(amount);
    if (read) swap.amount = read;
    if (swap.ingredientId !== undefined || swap.amount !== undefined) lines[index] = swap;
  }
  return { lines };
}

/** The value of the `swap` parameter; empty for swap mode with nothing changed yet. */
export function formatSwap(swap: Swap): string {
  return Object.entries(swap.lines)
    .map(([index, line]) => [Number(index), line] as const)
    .sort(([a], [b]) => a - b)
    .map(
      ([index, line]) =>
        `${index}:${line.ingredientId === undefined ? '' : encodeURIComponent(line.ingredientId)}:${
          line.amount ? amountToken(line.amount) : ''
        }`,
    )
    .join(',');
}

/** Sets `swap` on a query (null leaves swap mode); other parameters stay. */
export function withSwapQuery(query: URLSearchParams, swap: Swap | null): URLSearchParams {
  const next = new URLSearchParams(query);
  if (swap === null) next.delete('swap');
  else next.set('swap', formatSwap(swap));
  return next;
}

const sameAmount = (a: SwapAmount, line: SpecLine): boolean =>
  line.amountMax === undefined && a.value === line.amount && a.unit === line.unit;

function put(swap: Swap, index: number, line: LineSwap): Swap {
  const lines = Object.fromEntries(Object.entries(swap.lines).filter(([i]) => Number(i) !== index));
  if (line.ingredientId !== undefined || line.amount !== undefined) lines[index] = line;
  return { lines };
}

/** Another ingredient for a line; the saved ingredient clears the change. */
export function withIngredient(
  swap: Swap,
  index: number,
  ingredientId: string,
  original: SpecLine,
): Swap {
  const current = { ...swap.lines[index] };
  if (ingredientId === original.ingredientId) delete current.ingredientId;
  else current.ingredientId = ingredientId;
  return put(swap, index, current);
}

/** Another amount for a line; the saved amount clears the change. */
export function withAmount(
  swap: Swap,
  index: number,
  amount: SwapAmount,
  original: SpecLine,
): Swap {
  const current = { ...swap.lines[index] };
  if (sameAmount(amount, original)) delete current.amount;
  else current.amount = amount;
  return put(swap, index, current);
}

/** One line back to the saved spec. */
export function withoutLine(swap: Swap, index: number): Swap {
  return put(swap, index, {});
}

/** The swap changes at least one line that exists in the spec. */
export function isChanged(swap: Swap, lines: readonly SpecLine[]): boolean {
  return Object.keys(swap.lines).some((i) => Number(i) < lines.length);
}

/** How many lines of the spec the swap changes. */
export function changedCount(swap: Swap, lines: readonly SpecLine[]): number {
  return Object.keys(swap.lines).filter((i) => Number(i) < lines.length).length;
}

/**
 * The lines with the swap applied. A new ingredient drops the substitutes listed
 * for the saved one; a new amount ends a range (`amountMax`); a `top` line takes
 * a new ingredient but no amount (its volume is the what-if of the top).
 * Entries for lines that do not exist are ignored.
 */
export function applySwap(lines: readonly SpecLine[], swap: Swap): SpecLine[] {
  return lines.map((line, index) => {
    const change = swap.lines[index];
    if (!change) return line;
    const next: SpecLine = { ...line };
    if (change.ingredientId !== undefined) {
      next.ingredientId = change.ingredientId;
      delete next.substitutes;
    }
    if (change.amount && line.unit !== 'top') {
      next.amount = change.amount.value;
      next.unit = change.amount.unit;
      delete next.amountMax;
    }
    return next;
  });
}

export type SwapAmountText = { ok: true; amount: SwapAmount } | { ok: false; message: string };

/**
 * What the user typed as an amount, in the grammar of docs/units.md. A bare number
 * takes the unit of the line (`30` on a line in ml is 30 ml); a decimal comma is
 * accepted. Zero, negative, absurd amounts and `top` are refused with a reason.
 */
export function parseSwapAmount(text: string, lineUnit: string): SwapAmountText {
  const typed = text.trim().replace(/(\d),(\d)/g, '$1.$2');
  const unitLess = /^[\d.\s/]+$/.test(typed);
  // A bare number is read with any unit and then takes the line's own.
  const parsed = parseAmount(unitLess ? `${typed} ml` : typed);
  if (!parsed.ok) return { ok: false, message: parsed.error.message };
  const value = parsed.value.value;
  const unit = unitLess && UNIT_IDS.has(lineUnit) ? lineUnit : parsed.value.unit;
  if (!UNIT_IDS.has(unit)) return { ok: false, message: 'Not an amount to pour.' };
  if (!(value >= MIN_AMOUNT && value <= MAX_AMOUNT)) {
    return { ok: false, message: `Enter an amount from ${MIN_AMOUNT} up to ${MAX_AMOUNT}.` };
  }
  return { ok: true, amount: { value, unit } };
}

/** The smallest step of the stepper for a unit: the pour grid of docs/units.md. */
export function stepOf(unit: string): number {
  switch (unit) {
    case 'ml':
    case 'cl':
      return unit === 'ml' ? 2.5 : 0.25;
    case 'oz_us':
    case 'oz_imp':
    case 'tsp':
    case 'tbsp':
    case 'barspoon':
      return 0.25;
    case 'g':
    case 'oz_mass':
      return unit === 'g' ? 5 : 0.25;
    default:
      return 1;
  }
}

/** One step up or down; never below one step, so a line never reaches 0. */
export function stepAmount(amount: SwapAmount, direction: 1 | -1): SwapAmount {
  const step = stepOf(amount.unit);
  const next = Math.round((amount.value + direction * step) * 1e4) / 1e4;
  return { value: Math.min(MAX_AMOUNT, Math.max(step, next)), unit: amount.unit };
}

/** The amount of a line as a swap amount (the start of the stepper); a range starts at its low end. */
export function amountOfLine(line: SpecLine): SwapAmount {
  return { value: line.amount, unit: line.unit };
}

/** ml of a swap amount, when it is a volume. */
export function volumeMl(amount: SwapAmount): number | undefined {
  const base = toBase({ value: amount.value, unit: amount.unit as UnitId });
  return base.ok && base.value.kind === 'volume' ? base.value.value : undefined;
}
