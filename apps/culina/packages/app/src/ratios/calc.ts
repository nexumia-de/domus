// The calculator: grams per role from one ingredient, a total weight or a factor.
// All arithmetic is the engine's; this file only chooses the engine call.
import { cautionsFor, scaleFromAnchor, toGrams } from '@culina/engine';
import type { Amount, Caution, EffectiveTemplate, UnitId } from '@culina/engine';

export type CalcInput =
  | { mode: 'role'; role: string; value: number; unit: UnitId }
  | { mode: 'total'; value: number; unit: UnitId }
  | { mode: 'factor'; value: number };

export interface CalcRow {
  role: string;
  g: number;
}

/** `factor` is the grams per template part (all amounts divided by the template's parts). */
export type CalcResult = { ok: true; rows: CalcRow[]; factor: number } | { ok: false };

const finite = (rows: CalcRow[]): boolean => rows.every((r) => Number.isFinite(r.g));
const done = (rows: CalcRow[], factor: number): CalcResult =>
  finite(rows) && Number.isFinite(factor) ? { ok: true, rows, factor } : { ok: false };

/** One role weighed (any mass unit): the engine converts to grams and scales from that role. */
export const fromRole = (template: EffectiveTemplate, role: string, amount: Amount): CalcResult => {
  const grams = toGrams(amount);
  if (!grams.ok) return { ok: false };
  const scaled = scaleFromAnchor(template, role, grams.g);
  const known = template.parts.find((p) => p.role === role);
  if (!scaled.ok || known === undefined) return { ok: false };
  const rows = template.parts.map((p) => ({ role: p.role, g: scaled.g[p.role] ?? Number.NaN }));
  return done(rows, grams.g / known.parts);
};

/** The whole batch weighed: each role has its share of the template's parts. */
export const fromTotal = (template: EffectiveTemplate, totalG: number): CalcResult => {
  const sum = template.parts.reduce((s, p) => s + p.parts, 0);
  if (!Number.isFinite(totalG) || totalG <= 0 || sum <= 0) return { ok: false };
  return done(
    template.parts.map((p) => ({ role: p.role, g: (totalG * p.parts) / sum })),
    totalG / sum,
  );
};

/** Parts times a factor, the parts read as grams: with factor f one part is f grams. */
export const fromFactor = (template: EffectiveTemplate, factor: number): CalcResult => {
  if (!Number.isFinite(factor) || factor <= 0) return { ok: false };
  return done(
    template.parts.map((p) => ({ role: p.role, g: p.parts * factor })),
    factor,
  );
};

export const calculate = (template: EffectiveTemplate, input: CalcInput): CalcResult => {
  if (input.mode === 'role') {
    return fromRole(template, input.role, { value: input.value, unit: input.unit });
  }
  if (input.mode === 'factor') return fromFactor(template, input.value);
  const grams = toGrams({ value: input.value, unit: input.unit });
  return grams.ok ? fromTotal(template, grams.g) : { ok: false };
};

/**
 * The cautions to show next to a result, from the engine's `cautionsFor`.
 * The parts read as grams are no real reference batch, so the time caution is
 * always given; the engine's flag is used for salt.
 */
export const cautionsOf = (result: Extract<CalcResult, { ok: true }>): Caution[] => {
  const lines = result.rows.map((r) => ({ id: r.role, role: r.role }));
  const flags = cautionsFor(result.factor, lines);
  return flags.includes('time-not-linear') ? flags : ['time-not-linear', ...flags];
};
