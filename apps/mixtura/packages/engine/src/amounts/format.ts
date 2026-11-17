// Amount to display text. Stored values are never changed: this converts
// and rounds for the screen only (decision: units and display).
import { convert } from './convert';
import { decimalsOf, decimalText, mixedText } from './number-text';
import { parseAmount } from './parse';
import { roundForDisplay, roundingFor } from './rounding';
import { fail, ok } from './types';
import type { Amount, DisplaySystem, Result, UnitId, UnitOverrides } from './types';

export type FormatOptions = {
  system?: DisplaySystem; // default metric
  overrides?: UnitOverrides;
  /** The text the user typed; shown unchanged if it still says this amount in the display unit. */
  entered?: string;
};

export type Formatted = {
  text: string;
  /** The amount as shown: display unit, rounded value. */
  shown: Amount;
  /** The rounding step used, in the display unit. */
  step: number;
};

const OUNCE: Record<DisplaySystem, UnitId> = { metric: 'ml', us: 'oz_us', imperial: 'oz_imp' };

/**
 * The unit an amount is shown in: its own if it belongs to the system or is a convention.
 *
 * @param unit - The stored unit id.
 * @param system - The display system setting.
 * @returns The unit id to show; the stored amount itself is never rewritten.
 */
export function displayUnit(unit: UnitId, system: DisplaySystem): UnitId {
  if (unit === 'ml' || unit === 'cl') return system === 'metric' ? unit : OUNCE[system];
  if (unit === 'oz_us' || unit === 'oz_imp') return OUNCE[system];
  if (unit === 'oz_mass') return system === 'metric' ? 'g' : unit;
  return unit;
}

const WORDS: Partial<Record<UnitId, [string, string]>> = {
  barspoon: ['bar spoon', 'bar spoons'],
  dash: ['dash', 'dashes'],
  drop: ['drop', 'drops'],
  splash: ['splash', 'splashes'],
  whole: ['whole', 'whole'],
  leaf: ['leaf', 'leaves'],
  pinch: ['pinch', 'pinches'],
  peel: ['peel', 'peels'],
  slice: ['slice', 'slices'],
  sprig: ['sprig', 'sprigs'],
  wedge: ['wedge', 'wedges'],
  piece: ['piece', 'pieces'],
  cube: ['cube', 'cubes'],
  stalk: ['stalk', 'stalks'],
  scoop: ['scoop', 'scoops'],
  chunk: ['chunk', 'chunks'],
  yolk: ['yolk', 'yolks'],
  stick: ['stick', 'sticks'],
  bean: ['bean', 'beans'],
  capsule: ['capsule', 'capsules'],
};

const SYMBOL: Partial<Record<UnitId, string>> = {
  oz_us: 'oz',
  oz_imp: 'imp oz',
  oz_mass: 'oz av',
};

function unitText(unit: UnitId, value: number): string {
  const words = WORDS[unit];
  if (words) return value <= 1 ? words[0] : words[1];
  return SYMBOL[unit] ?? unit;
}

/**
 * Like `formatAmount`, with the shown amount and the rounding step.
 *
 * @param amount - Value in `amount.unit`.
 * @param options - Display system and entered-unit handling.
 * @returns `text`, `shown` (amount in the display unit, rounded) and `step` (rounding step in the display unit), or an error.
 */
export function formatAmountDetailed(
  amount: Amount,
  options: FormatOptions = {},
): Result<Formatted> {
  const system = options.system ?? 'metric';
  const unit = displayUnit(amount.unit, system);
  let value = amount.value;
  if (unit !== amount.unit) {
    const c = convert(amount, unit, options.overrides);
    if (!c.ok) return c;
    value = c.value.value;
  } else if (!Number.isFinite(value) || value < 0) {
    return fail('invalid_value', 'An amount must be a finite number of zero or more.');
  }
  const { value: rounded, step } = roundForDisplay(unit, value);
  const shown: Amount = { value: rounded, unit };
  if (options.entered !== undefined) {
    const parsed = parseAmount(options.entered);
    if (parsed.ok && parsed.value.unit === unit && Math.abs(parsed.value.value - value) < 1e-9) {
      return ok({ text: options.entered.trim(), shown, step });
    }
  }
  const number =
    rounded === 0
      ? '0'
      : roundingFor(unit, value).fractional
        ? mixedText(rounded)
        : decimalText(rounded, decimalsOf(step));
  return ok({ text: `${number} ${unitText(unit, rounded)}`, shown, step });
}

/**
 * Formats an amount for display (rounded for reading, never stored).
 *
 * @param amount - Value in `amount.unit`.
 * @param options - Display system and entered-unit handling.
 * @returns The text, for example `45 ml` or `1.5 oz`, or an error.
 */
export function formatAmount(amount: Amount, options: FormatOptions = {}): Result<string> {
  const f = formatAmountDetailed(amount, options);
  return f.ok ? ok(f.value.text) : f;
}
