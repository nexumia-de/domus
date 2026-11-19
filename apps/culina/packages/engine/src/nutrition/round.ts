// The display rounding of nutrition figures: the only place nutrition numbers are rounded. The
// steps are those of 21 CFR 101.9(c), read at www.ecfr.gov (the EU Commission's guidance on
// tolerances could not be read: its host was blocked). Where that rule is silent (kJ, salt) the
// choice is Culina's and is marked below. Documented in docs/engine-rules.md (Nutrition).
import { roundMass } from '../amounts/round';
import type { PortionNutrients, RoundNutritionResult } from './types';

/** Where the steps come from, for the docs and the screen. */
export const ROUNDING_SOURCE =
  'Code of Federal Regulations, Title 21, section 101.9(c), https://www.ecfr.gov/current/title-21/part-101/section-101.9';

const step = (value: number, size: number): number => {
  const r = roundMass(value, size);
  return r.ok ? r.g : value;
};

/** Calories: nearest 5 up to and including 50, nearest 10 above; below 5 may be zero (c)(1). */
const energy = (kcal: number): number => step(kcal, kcal <= 50 ? 5 : 10);

/** Protein, carbohydrate, fibre: nearest gram; below 0.5 g zero (c)(6), (c)(7), (c)(8). */
const gram = (g: number): number => (g < 0.5 ? 0 : step(g, 1));

/** Fat: nearest 0.5 g below 5 g, nearest gram from 5 g; below 0.5 g zero (c)(2). */
const fat = (g: number): number => (g < 0.5 ? 0 : step(g, g < 5 ? 0.5 : 1));

/**
 * Sodium: zero below 5 mg, nearest 5 mg up to 140 mg, nearest 10 mg above (c)(4). The rule is
 * about sodium; Culina applies the same steps to the salt equivalent (Culina's choice).
 */
const salt = (g: number): number => {
  const mg = g * 1000;
  if (mg < 5) return 0;
  return step(mg, mg <= 140 ? 5 : 10) / 1000;
};

/** Kilojoules: nearest 10 kJ (Culina's choice: the rule gives steps for calories only). */
const kilojoule = (kJ: number): number => step(kJ, 10);

const FIELDS: { key: keyof PortionNutrients; round: (v: number) => number }[] = [
  { key: 'kcal', round: energy },
  { key: 'kJ', round: kilojoule },
  { key: 'proteinG', round: gram },
  { key: 'fatG', round: fat },
  { key: 'carbohydrateG', round: gram },
  { key: 'fibreG', round: gram },
  { key: 'saltG', round: salt },
];

/**
 * Rounds the figures of one portion for display. Calories to 5 (up to 50) or 10; protein,
 * carbohydrate and fibre to the gram; fat to 0.5 g below 5 g, else the gram; salt in the sodium
 * steps (5 mg up to 140 mg, 10 mg above), kJ to 10; whatever is below the rule's lowest step is 0.
 * A figure that is absent stays absent.
 *
 * @param figures - Figures per portion as `dishNutrition` gives them.
 * @returns The rounded figures, or `invalid-value` (with the field) for a negative or non-finite one.
 */
export function roundNutrition(figures: PortionNutrients): RoundNutritionResult {
  const rounded: Partial<PortionNutrients> = {};
  for (const { key, round } of FIELDS) {
    const v = figures[key];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0) {
      return { ok: false, error: { code: 'invalid-value', field: key } };
    }
    rounded[key] = Number(round(v).toPrecision(12));
  }
  return { ok: true, rounded: rounded as PortionNutrients };
}
