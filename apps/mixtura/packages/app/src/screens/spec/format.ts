// Text of amounts and numbers on the spec screen: the engine formats the
// amounts (display unit from the setting, rounded for reading); this file
// only joins them and words lists of names.

import { formatAmountDetailed, type DisplaySystem, type UnitId } from '@mixtura/engine';
import { strings } from '../../strings';

/** An amount in the display unit; `top` has no amount, a range line shows both ends. */
export function amountText(
  line: { amount: number; amountMax?: number; unit: string },
  system: DisplaySystem,
): string {
  if (line.unit === 'top') return strings.spec.top;
  const one = (value: number): string => {
    const shown = formatAmountDetailed({ value, unit: line.unit as UnitId }, { system });
    return shown.ok ? shown.value.text : `${value} ${line.unit}`;
  };
  const low = one(line.amount);
  if (line.amountMax === undefined || line.amountMax === line.amount) return low;
  const high = one(line.amountMax);
  const unit = (text: string): string => text.slice(text.indexOf(' ') + 1);
  return unit(low) === unit(high)
    ? `${low.slice(0, low.indexOf(' '))}–${high}`
    : `${low} – ${high}`;
}

/** A number with a fixed count of decimals (17.6, 19.0, 0.99). */
export function fixed(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/** "Gin, Lemon Juice and Syrup"; past `max` names the rest is counted. */
export function listNames(names: readonly string[], max = 4): string {
  if (names.length <= max) {
    if (names.length < 2) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  const rest = names.length - max;
  return `${names.slice(0, max).join(', ')} and ${rest} more`;
}
