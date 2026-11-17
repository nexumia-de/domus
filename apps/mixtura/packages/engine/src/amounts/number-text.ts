// Number to display text: fixed decimals, or a mixed number with glyphs.
const GLYPH_OF: Readonly<Record<number, string>> = {
  8: '¼',
  16: '½',
  24: '¾',
  4: '⅛',
  12: '⅜',
  20: '⅝',
  28: '⅞',
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Decimals needed to show a step exactly (1 -> 0, 0.5 -> 1, 0.01 -> 2). */
export function decimalsOf(step: number): number {
  let d = 0;
  while (d < 6 && Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) > 1e-9) d += 1;
  return d;
}

export function decimalText(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/** A value on a 1/32 grid as `1½`, `¼`, `1 1/16` or `2`. */
export function mixedText(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const k = Math.round((value - whole) * 32);
  if (k === 0) return String(whole);
  const glyph = GLYPH_OF[k];
  if (glyph !== undefined) return whole > 0 ? `${whole}${glyph}` : glyph;
  const g = gcd(k, 32);
  const fraction = `${k / g}/${32 / g}`;
  return whole > 0 ? `${whole} ${fraction}` : fraction;
}

/** Fixed decimals with trailing zeros removed (22.50 -> 22.5, 30.0 -> 30). */
export function trimmedText(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}
