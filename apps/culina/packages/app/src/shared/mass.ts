// Display of numbers, shared by the ratio, component and dish screens. The engine never rounds; the app rounds once, here.
import { convert, displayStep, roundMass } from '@culina/engine';
import type { Lang, UnitId } from '@culina/engine';
import { appLang, withDecimalMark } from './locale';

export const MASS_UNITS = ['g', 'kg', 'oz', 'lb'] as const satisfies readonly UnitId[];
export type MassUnit = (typeof MASS_UNITS)[number];

/** Decimals shown after converting the rounded grams to another unit. */
const DECIMALS: Record<Exclude<MassUnit, 'g'>, number> = { kg: 3, oz: 2, lb: 3 };

/**
 * Grams for display in the chosen unit: rounded to the engine's display step
 * (0.1 g below 10 g, else 1 g), then converted with the engine; the other
 * units are trimmed to a fixed number of decimals, which only removes noise.
 */
export const formatMass = (g: number, unit: MassUnit, lang: Lang = appLang): string => {
  const rounded = roundMass(g, displayStep(g));
  if (!rounded.ok) return '';
  if (rounded.g === 0 || unit === 'g') return withDecimalMark(`${rounded.g} g`, lang);
  const converted = convert({ value: rounded.g, unit: 'g' }, unit);
  if (!converted.ok) return '';
  return withDecimalMark(`${Number(converted.amount.value.toFixed(DECIMALS[unit]))} ${unit}`, lang);
};

/** A number trimmed to at most `decimals` places, without trailing zeros; a comma in German. */
export const formatNumber = (n: number, decimals = 2, lang: Lang = appLang): string =>
  withDecimalMark(String(Number(n.toFixed(decimals))), lang);
