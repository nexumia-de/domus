// The number part of the amount grammar (docs/units.md, Parsing grammar):
// decimal with "." or ",", fraction, mixed number, unicode glyph.
import { fail, ok } from './types';
import type { Result } from './types';

export const GLYPHS: Readonly<Record<string, number>> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};

const G = `[${Object.keys(GLYPHS).join('')}]`;
const MIXED_FRACTION = /^(\d+)\s+(\d+)\/(\d+)/;
const MIXED_GLYPH = new RegExp(`^(\\d+)\\s*(${G})`);
const FRACTION = /^(\d+)\/(\d+)/;
const GLYPH = new RegExp(`^(${G})`);
const DECIMAL = /^(\d+)(?:([.,])(\d+))?/;

export type NumberPrefix = { value: number; rest: string };

function fraction(top: string, bottom: string): Result<number> {
  const d = Number(bottom);
  if (d === 0) return fail('zero_denominator', `The denominator in ${top}/${bottom} is zero.`);
  return ok(Number(top) / d);
}

/** Read the number at the start of `text` (already trimmed). */
export function parseNumberPrefix(text: string): Result<NumberPrefix> {
  if (new RegExp(`^[-−]\\s*(\\d|${G})`).test(text)) {
    return fail('negative', 'An amount cannot be negative.');
  }
  let value: number;
  let rest: string;
  let m: RegExpExecArray | null;
  let ambiguous = '';
  if ((m = MIXED_FRACTION.exec(text))) {
    const f = fraction(m[2] as string, m[3] as string);
    if (!f.ok) return f;
    value = Number(m[1]) + f.value;
    rest = text.slice(m[0].length);
  } else if ((m = MIXED_GLYPH.exec(text))) {
    value = Number(m[1]) + (GLYPHS[m[2] as string] as number);
    rest = text.slice(m[0].length);
  } else if ((m = FRACTION.exec(text))) {
    const f = fraction(m[1] as string, m[2] as string);
    if (!f.ok) return f;
    value = f.value;
    rest = text.slice(m[0].length);
  } else if ((m = GLYPH.exec(text))) {
    value = GLYPHS[m[1] as string] as number;
    rest = text.slice(m[0].length);
  } else if ((m = DECIMAL.exec(text))) {
    if (m[2] === ',' && m[1] !== '0' && (m[3] as string).length === 3) ambiguous = m[0];
    value = Number(m[3] === undefined ? m[1] : `${m[1]}.${m[3]}`);
    rest = text.slice(m[0].length);
  } else {
    return fail('no_number', 'No number found at the start of the amount.');
  }
  if (/^[eE][+-]?\d/.test(rest)) return fail('exponent', 'Exponent notation is not accepted.');
  if (/^\s*[-–—]\s*\d/.test(rest) || /^\s+to\s+\d/i.test(rest)) {
    return fail('range', 'Ranges are not accepted; enter one amount.');
  }
  if (/^[.,]\d/.test(rest)) {
    return fail('separators', 'More than one decimal or thousands separator.');
  }
  if (ambiguous) {
    return fail(
      'ambiguous_separator',
      `"${ambiguous}" could be a thousands separator; write a decimal point or a unit without one.`,
    );
  }
  return ok({ value, rest });
}
