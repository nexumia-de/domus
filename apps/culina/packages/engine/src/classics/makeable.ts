// What the stock allows for the shipped classics: each classic is derived (`deriveClassic`) into a
// dish and its components, and the finder (`makeable`) judges them against the stock. No second
// logic: the statuses, substitutions, roles and urgency are the finder's. A line that is still
// `wanted` has no catalogue ingredient to look for in the stock; it never counts as lacking and is
// reported apart (`notInCatalogue`). Water is not asked for at all. Pure: today comes in.
import { dishReport, makeable } from '../makeable';
import type {
  MakeableCandidate,
  MakeableDish,
  MakeableError,
  MakeableInput,
  MakeableLineReport,
} from '../makeable';
import { rank } from '../makeable/rank';
import { pickText } from '../text/i18n';
import type { I18nText, Lang } from '../text/i18n';
import { componentsInDish } from './base';
import { deriveClassic } from './derive';
import type { HouseholdMeasure } from '../amounts/round';
import type { DerivedLine, DerivedSlot, DeriveErrorCode } from './derive';
import type { Classic, Country, Course } from './types';

/** The English or German name of water in a `wanted` line: "Water", "Cold water", "Wasser". */
const WATER = /^(?:(?:ice-?cold|cold|eis|kaltes) )?(?:water|wasser)\b/i;

/** Whether a `wanted` name is water, which every kitchen has and no finder asks for. */
export const isWater = (wanted: I18nText): boolean =>
  WATER.test(wanted.en) || WATER.test(wanted.de);

export interface ClassicsMakeableInput extends Omit<
  MakeableInput,
  'components' | 'dishes' | 'templates'
> {
  classics: readonly Classic[];
  /** Portions to judge the amounts for; default as `deriveClassic` (2). */
  portions?: number;
  /** The language of the names in the result; default English. */
  lang?: Lang;
}

/** A classic as the finder judged it: a dish candidate with the classic's own facts. */
export interface ClassicCandidate extends Omit<MakeableCandidate, 'kind'> {
  kind: 'classic';
  country: Country;
  course: Course;
  vegetarian: boolean;
  /** The names of `wanted` lines (water left out), once each, in file order. */
  notInCatalogue: string[];
}

export type ClassicsMakeableError =
  | { code: MakeableError['code']; classic: string; error: MakeableError }
  | { code: DeriveErrorCode; classic: string };

export type ClassicsMakeableResult =
  { ok: true; candidates: ClassicCandidate[] } | { ok: false; error: ClassicsMakeableError };

type DishSlot = MakeableDish['slots'][number];

/**
 * The slots of the dish with every classic component written out as its own lines, so that the
 * finder names the ingredient that lacks, not the whole component. A component's lines take the role
 * of the slot that names it; a line without a `ref` (still `wanted`) is left out. A component
 * that names itself, directly or through others, is expanded once.
 */
function flatSlots(
  derived: Extract<ReturnType<typeof deriveClassic>, { ok: true }>,
): { slot: DishSlot; measure?: HouseholdMeasure }[] {
  const byId = new Map(derived.components.map((c) => [c.id, c]));
  const slotOf = (
    it: DerivedLine | DerivedSlot,
    role: string,
    stack: readonly string[],
    optional: boolean,
  ): { slot: DishSlot; measure?: HouseholdMeasure }[] => {
    const ref = it.ref;
    if (ref === undefined) return [];
    if (ref.kind === 'component') {
      const c = byId.get(ref.id);
      if (c === undefined || stack.includes(c.id)) return [];
      return c.lines.flatMap((l) => slotOf(l, role, [...stack, c.id], optional));
    }
    return [
      {
        slot: {
          role,
          ref,
          ...(it.amount === undefined ? {} : { amount: it.amount }),
          ...(optional ? { optional: true } : {}),
        },
        ...(it.measure === undefined ? {} : { measure: it.measure }),
      },
    ];
  };
  return derived.dish.slots.flatMap((s) => slotOf(s, s.role, [], s.optional === true));
}

/**
 * A classic as the finder's dish: derived for the portions, its components written out as lines,
 * and the names of its `wanted` lines (water left out), once each, in file order.
 */
function classicDish(
  classic: Classic,
  portions: number | undefined,
  language: Lang,
):
  | { ok: true; dish: MakeableDish; names: string[]; measures: (HouseholdMeasure | undefined)[] }
  | { ok: false; code: DeriveErrorCode } {
  const derived = deriveClassic(classic, {
    lang: language,
    ...(portions === undefined ? {} : { portions }),
  });
  if (!derived.ok) return { ok: false, code: derived.error.code };
  // Only what the dish uses: the alternatives of a base are not asked for.
  const inDish = componentsInDish(classic);
  const lines = (classic.components ?? []).filter((c) => inDish.has(c.id)).flatMap((c) => c.lines);
  const names = [...lines, ...classic.slots].flatMap((l) =>
    l.wanted === undefined || isWater(l.wanted) ? [] : [pickText(l.wanted, language)],
  );
  const date = '1970-01-01';
  const flat = flatSlots(derived);
  return {
    ok: true,
    dish: {
      id: classic.id,
      version: { family: classic.id, date },
      name: derived.dish.name,
      slots: flat.map((f) => f.slot),
    },
    names: [...new Set(names)],
    measures: flat.map((f) => f.measure),
  };
}

export interface ClassicReportInput extends Omit<
  MakeableInput,
  'components' | 'dishes' | 'templates'
> {
  /** The classic as it is cooked: a frame with the cook's choice of filling already made. */
  classic: Classic;
  /** Portions to judge the amounts for; default as `deriveClassic` (2). */
  portions?: number;
  /** The language of the names in the result; default English. */
  lang?: Lang;
}

export type ClassicReportResult =
  | {
      ok: true;
      name: string;
      lines: MakeableLineReport[];
      notInCatalogue: string[];
      /**
       * Per line (by its `index`), the spoon or cup the source wrote where it wrote one: the
       * amount stays in millilitres, the measure is for display, as on the dish's page.
       */
      measures: (HouseholdMeasure | undefined)[];
    }
  | { ok: false; error: ClassicsMakeableError };

/**
 * Every line of one classic against the stock, as `classicsMakeable` judges it, without its rule
 * for what is listed (a classic with nothing in stock is reported too): what the hand-over to the
 * shopping list reads. Only the components in the dish are asked for, so a frame is judged with
 * the filling it has.
 *
 * @returns The dish's name, a report per line of the written-out dish and the names of its
 *   `wanted` lines; or the first error.
 */
export function classicReport(input: ClassicReportInput): ClassicReportResult {
  const { classic, portions, lang, ...rest } = input;
  const made = classicDish(classic, portions, lang ?? 'en');
  if (!made.ok) return { ok: false, error: { code: made.code, classic: classic.id } };
  const found = dishReport({ ...rest, dishes: [made.dish] }, classic.id);
  if (!found.ok) {
    const error = found.error as MakeableError;
    return { ok: false, error: { code: error.code, classic: classic.id, error } };
  }
  return {
    ok: true,
    name: found.name,
    lines: found.lines,
    notInCatalogue: made.names,
    measures: made.measures,
  };
}

/**
 * Judges every classic against the stock. A classic is listed when it lacks at most
 * `options.maxMissing` catalogued required lines (default 0) and has at least one that is there,
 * as for the notebook's own dishes. A classic that lacks nothing but has `wanted` lines is
 * `complete`, with the lines in `notInCatalogue`.
 *
 * @param input - Classics, the ingredient tree (notebook and catalogue), stock, `today`, facts
 *   and options as for `makeable`; optional `portions` and `lang`.
 * @returns Candidates in the finder's ranking order (urgency, roles covered, name, id); or the
 *   first error: a `makeable` error or a `deriveClassic` error, with the classic's id.
 */
export function classicsMakeable(input: ClassicsMakeableInput): ClassicsMakeableResult {
  const { classics, portions, lang, ...rest } = input;
  const language = lang ?? 'en';
  const out: { candidate: MakeableCandidate; classic: Classic; names: string[] }[] = [];
  for (const classic of classics) {
    const made = classicDish(classic, portions, language);
    if (!made.ok) return { ok: false, error: { code: made.code, classic: classic.id } };
    const { dish, names } = made;
    const found = makeable({ ...rest, dishes: [dish] });
    if (!found.ok) {
      return {
        ok: false,
        error: { code: found.error.code, classic: classic.id, error: found.error },
      };
    }
    for (const candidate of found.candidates) {
      if (candidate.kind === 'dish') out.push({ candidate, classic, names });
    }
  }
  // The same ranking contract as `makeable`, so a list of own dishes and classics can be ranked
  // as one (`rankCandidates`).
  return {
    ok: true,
    candidates: rank(
      out.map(({ candidate, classic, names }) => ({
        ...candidate,
        kind: 'classic' as const,
        country: classic.country,
        course: classic.course,
        vegetarian: classic.vegetarian,
        notInCatalogue: names,
      })),
    ),
  };
}
