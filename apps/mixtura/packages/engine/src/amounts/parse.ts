// Text to amount, grammar in docs/units.md. Never throws for user input.
import { parseNumberPrefix } from './number';
import { UNITS } from './table';
import { fail, ok } from './types';
import type { Amount, Result, UnitId } from './types';

/** Symbols that may follow a number without a space (`1.5oz`); the rest are words. */
const ABBREVIATIONS = new Set(['ml', 'cl', 'oz', 'fl oz', 'fl. oz.', 'tsp', 'tbsp', 'bsp', 'g']);

const SYMBOLS = new Map<string, UnitId>(
  UNITS.flatMap((u) => u.symbols.map((s) => [s.toLowerCase(), u.id] as const)),
);

export type ParseOptions = {
  /** What a plain "oz" means; default the US fluid ounce. */
  ounce?: 'us' | 'imperial';
  /** The line's ingredient is a solid: "oz" is the mass ounce. */
  solid?: boolean;
};

function lookup(word: string): string | undefined {
  if (SYMBOLS.has(word)) return word;
  const singular = word.slice(0, -1);
  if (word.endsWith('s') && singular.length >= 3 && SYMBOLS.has(singular)) return singular;
  return undefined;
}

function resolve(symbol: string, id: UnitId, options: ParseOptions): UnitId {
  if (symbol !== 'oz') return id;
  if (options.solid) return 'oz_mass';
  return options.ounce === 'imperial' ? 'oz_imp' : 'oz_us';
}

/**
 * Parses text such as `1 1/2 oz` into an exact amount; never throws for user input.
 *
 * @param text - What the user typed: a number (decimal, fraction, vulgar fraction) and a unit symbol.
 * @param options - `ounce` chooses the meaning of a plain `oz` (default US fluid ounce); `solid` makes it the mass ounce.
 * @returns `{ ok: true, value: { value, unit } }` with the number as typed (no unit conversion), or an error code and message.
 */
export function parseAmount(text: string, options: ParseOptions = {}): Result<Amount> {
  const trimmed = text.trim();
  if (trimmed === '') return fail('empty', 'Enter an amount.');
  const n = parseNumberPrefix(trimmed);
  if (!n.ok) return n;
  const spaced = /^\s/.test(n.value.rest);
  const word = n.value.rest.trim().toLowerCase().replace(/\s+/g, ' ');
  if (word === '') return fail('no_unit', 'Add a unit, for example ml or oz.');
  const symbol = lookup(word);
  const id = symbol === undefined ? undefined : SYMBOLS.get(symbol);
  if (symbol === undefined || id === undefined) {
    return fail('unknown_unit', `"${n.value.rest.trim()}" is not a unit Mixtura knows.`);
  }
  if (!spaced && !ABBREVIATIONS.has(symbol)) {
    return fail('space_required', `Put a space before "${n.value.rest.trim()}".`);
  }
  return ok({ value: n.value.value, unit: resolve(symbol, id, options) });
}
