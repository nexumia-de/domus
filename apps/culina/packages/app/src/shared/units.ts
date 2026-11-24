// The one place where a unit gets its visible name, and where a piece count or a spoon measure is
// written as a cook writes it. The rounding is the engine's (`roundPieces`, `roundMeasure`); this
// only picks the words and the fraction signs, and writes the exact figure quietly beside.
import { roundMeasure, roundPieces } from '@culina/engine';
import type { HouseholdMeasure, Lang } from '@culina/engine';
import { strings } from '../strings';
import { appLang } from './locale';
import { formatNumber } from './mass';

/** The name of a unit in the app's language: "EL", "Stück", "pint (UK)"; an unknown id as it is. */
export const unitName = (unit: string): string =>
  (strings.units as Record<string, string | undefined>)[unit] ?? unit;

/** Options of a unit select: the stored id as the value, the name as the label. */
export const unitOptions = (units: readonly string[]): { value: string; label: string }[] =>
  units.map((u) => ({ value: u, label: unitName(u) }));

/** An amount as written, with its unit's name: "1 Stück", "2 EL", "1,5 kg". */
export const writtenAmount = (amount: { value: number; unit: string }): string =>
  `${formatNumber(amount.value, 3)} ${unitName(amount.unit)}`;

const FRACTIONS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/** A number of quarters or halves as a cook writes it: "½", "1¼", "5". */
export const fraction = (n: number, lang: Lang = appLang): string => {
  const whole = Math.floor(n);
  const part = FRACTIONS[Number((n - whole).toFixed(2))];
  if (part === undefined) return formatNumber(n, 2, lang);
  return whole === 0 ? part : `${whole}${part}`;
};

/**
 * Pieces as shown: to a whole or a half, with the exact count quietly beside where they differ.
 * "5½ Stück (5,33)". The exact count stays the one in sums and nutrition.
 */
export const piecesText = (count: number): string => {
  const shown = roundPieces(count);
  if (!shown.ok) return writtenAmount({ value: count, unit: 'count' });
  const text = `${fraction(shown.value)} ${unitName('count')}`;
  return shown.exact ? text : strings.exactBeside(text, formatNumber(count, 2));
};

/**
 * A volume the source wrote in a spoon or a cup, as shown: that measure to the quarter, with the
 * exact millilitres quietly beside where they differ. "½ EL", "¼ TL (1,6 ml)".
 */
export const measureText = (ml: number, measure: HouseholdMeasure): string => {
  const shown = roundMeasure(ml, measure);
  if (!shown.ok) return `${formatNumber(ml, 1)} ${unitName('ml')}`;
  const text = `${fraction(shown.value)} ${unitName(measure)}`;
  return shown.exact
    ? text
    : strings.exactBeside(text, `${formatNumber(ml, ml < 10 ? 1 : 0)} ${unitName('ml')}`);
};

/**
 * An amount written in a unit, scaled by a factor, as shown: pieces to the half, every other unit
 * as a number with its name. For a line that cannot be weighed, so it keeps its own unit.
 */
export const scaledWritten = (amount: { value: number; unit: string }, factor: number): string =>
  amount.unit === 'count'
    ? piecesText(amount.value * factor)
    : writtenAmount({ value: amount.value * factor, unit: amount.unit });
