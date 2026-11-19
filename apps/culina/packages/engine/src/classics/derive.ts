// Derives what the app shows and cooks from a classic: amounts converted from the source's units to
// grams, millilitres or pieces and scaled from the source's persons to the portions asked for, in the
// shapes the model already has. The app does no arithmetic.
import type { Amount, UnitId } from '../amounts/types';
import type { ComponentRef, FoodState } from '../components/types';
import type { Step } from '../steps/types';
import { pickText } from '../text/i18n';
import type { Lang } from '../text/i18n';
import type { AmountWord, Classic, ClassicLine, ClassicSlot, SourceAmount } from './types';
import { resolveSourceUnit } from './units';

/** Portions of a dish when the user asks for none (helper plan: two). */
export const DEFAULT_PORTIONS = 2;

export interface DeriveOptions {
  /** Portions wanted; default 2. A positive number. */
  portions?: number;
  /** The language of the names and notes in the result; steps keep both languages. */
  lang: Lang;
}

/** A component line in the stored shape; a line with a `wanted` name has no `ref` yet. */
export interface DerivedLine {
  key?: string;
  ref?: ComponentRef;
  /** The name of an ingredient the catalogue lacks. */
  wanted?: string;
  /** Absent when the source gives none; then `amountWord` says "to taste" or "as needed" where the source does, else nothing is shown. */
  amount?: Amount;
  amountWord?: AmountWord;
  role?: string;
  state?: FoodState;
  note?: string;
  /** A remark about the source, for the source section only. */
  sourceNote?: string;
  /** The source's own wording, when the classic gives it. */
  original?: string;
}

export interface DerivedComponent {
  id: string;
  name: string;
  role?: string;
  lines: DerivedLine[];
  steps: Step[];
}

export interface DerivedSlot {
  key?: string;
  role: string;
  ref?: ComponentRef;
  wanted?: string;
  amount?: Amount;
  optional?: boolean;
  original?: string;
}

export interface DerivedDish {
  id: string;
  name: string;
  portions: number;
  slots: DerivedSlot[];
}

/** A line or slot with a range: `amount` of the line is its middle. `componentId` is absent for a slot. */
export interface DerivedRange {
  componentId?: string;
  index: number;
  min: Amount;
  max: Amount;
}

/** A line or slot the source gives no amount for. */
export interface Unmeasured {
  componentId?: string;
  index: number;
}

export type DeriveErrorCode = 'invalid-portions' | 'unknown-unit' | 'invalid-amount';

export type DeriveResult =
  | {
      ok: true;
      dish: DerivedDish;
      components: DerivedComponent[];
      /** Lines and slots without an amount, in file order. */
      unmeasured: Unmeasured[];
      ranges: DerivedRange[];
      /** Portions asked for divided by the source's persons. */
      factor: number;
    }
  | { ok: false; error: { code: DeriveErrorCode; path?: string; unit?: string } };

const CANONICAL: Record<'mass' | 'volume' | 'count', UnitId> = {
  mass: 'g',
  volume: 'ml',
  count: 'count',
};

/** Trims binary noise (10 significant digits). */
const clean = (n: number): number => Number(n.toPrecision(10));

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

type Converted = { amount: Amount; range?: { min: Amount; max: Amount } };

/** Converts one source amount; the middle of a range is the amount. */
function convert(a: SourceAmount, classic: Classic, factor: number): Converted | string {
  if (!positive(a.value) || (a.max !== undefined && !positive(a.max))) return 'invalid-amount';
  const size = resolveSourceUnit(a.unit, classic);
  if (size === undefined) return 'unknown-unit';
  const unit = CANONICAL[size.kind];
  const at = (n: number): Amount => ({ value: clean(n * size.factor * factor), unit });
  if (a.max === undefined) return { amount: at(a.value) };
  const min = at(a.value);
  const max = at(a.max);
  return { amount: { value: clean((min.value + max.value) / 2), unit }, range: { min, max } };
}

/**
 * Derives the dish and its components for a number of portions. Every amount is converted by the
 * unit table or the classic's own `units` (mass to grams, volume to millilitres, count to count)
 * and multiplied by portions divided by the source's persons; nothing is rounded beyond 10
 * significant digits. A range becomes its middle in `amount` and is listed in `ranges`; a line
 * without an amount stays without and is listed in `unmeasured`. Names and notes come in `lang`.
 *
 * @param classic - A classic that passed `validateClassic`.
 * @param options - Portions (default 2) and language.
 * @returns The dish, the components, `unmeasured`, `ranges` and the factor; or `invalid-portions`,
 * `unknown-unit` (with `unit`) or `invalid-amount`, each with the `path` of the amount.
 */
export function deriveClassic(classic: Classic, options: DeriveOptions): DeriveResult {
  const portions = options.portions ?? DEFAULT_PORTIONS;
  if (!positive(portions)) return { ok: false, error: { code: 'invalid-portions' } };
  const factor = clean(portions / classic.persons.value);
  const unmeasured: Unmeasured[] = [];
  const ranges: DerivedRange[] = [];
  const text = (t: Parameters<typeof pickText>[0]): string => pickText(t, options.lang);

  type Failure = { ok: false; error: { code: DeriveErrorCode; path: string; unit?: string } };
  const amountOf = (
    it: ClassicLine | ClassicSlot,
    path: string,
    componentId: string | undefined,
    index: number,
  ): { amount?: Amount; original?: string } | Failure => {
    const base = componentId === undefined ? {} : { componentId };
    if (it.amount === undefined) {
      unmeasured.push({ ...base, index });
      return {};
    }
    const done = convert(it.amount, classic, factor);
    if (typeof done === 'string') {
      const code = done as DeriveErrorCode;
      return {
        ok: false,
        error: { code, path, ...(code === 'unknown-unit' ? { unit: it.amount.unit } : {}) },
      };
    }
    if (done.range) ranges.push({ ...base, index, ...done.range });
    return {
      amount: done.amount,
      ...(it.amount.original === undefined ? {} : { original: it.amount.original }),
    };
  };
  const who = (it: ClassicLine | ClassicSlot) => ({
    ...(it.key === undefined ? {} : { key: it.key }),
    ...(it.ref === undefined ? {} : { ref: it.ref }),
    ...(it.wanted === undefined ? {} : { wanted: text(it.wanted) }),
  });

  const components: DerivedComponent[] = [];
  for (const [ci, c] of (classic.components ?? []).entries()) {
    const lines: DerivedLine[] = [];
    for (const [j, line] of c.lines.entries()) {
      const got = amountOf(line, `components[${ci}].lines[${j}].amount`, c.id, j);
      if ('ok' in got) return got;
      lines.push({
        ...who(line),
        ...got,
        ...(line.role === undefined ? {} : { role: line.role }),
        ...(line.state === undefined ? {} : { state: line.state }),
        ...(line.note === undefined ? {} : { note: text(line.note) }),
        ...(line.sourceNote === undefined ? {} : { sourceNote: text(line.sourceNote) }),
        ...(line.amountWord === undefined ? {} : { amountWord: line.amountWord }),
      });
    }
    components.push({
      id: c.id,
      name: text(c.name),
      ...(c.role === undefined ? {} : { role: c.role }),
      lines,
      steps: [...(c.steps ?? [])],
    });
  }
  const slots: DerivedSlot[] = [];
  for (const [i, slot] of classic.slots.entries()) {
    const got = amountOf(slot, `slots[${i}].amount`, undefined, i);
    if ('ok' in got) return got;
    slots.push({
      ...who(slot),
      role: slot.role,
      ...got,
      ...(slot.optional === undefined ? {} : { optional: slot.optional }),
    });
  }
  return {
    ok: true,
    dish: { id: classic.id, name: text(classic.name), portions, slots },
    components,
    unmeasured,
    ranges,
    factor,
  };
}
