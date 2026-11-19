// What the stock allows for the shipped classics: each classic is derived (`deriveClassic`) into a
// dish and its components, and the finder (`makeable`) judges them against the stock. No second
// logic: the statuses, substitutions, roles and urgency are the finder's. A line that is still
// `wanted` has no catalogue ingredient to look for in the stock; it never counts as lacking and is
// reported apart (`notInCatalogue`). Water is not asked for at all. Pure: today comes in.
import { makeable } from '../makeable';
import type { MakeableCandidate, MakeableDish, MakeableError, MakeableInput } from '../makeable';
import { rank } from '../makeable/rank';
import { pickText } from '../text/i18n';
import type { I18nText, Lang } from '../text/i18n';
import { deriveClassic } from './derive';
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
function flatSlots(derived: Extract<ReturnType<typeof deriveClassic>, { ok: true }>): DishSlot[] {
  const byId = new Map(derived.components.map((c) => [c.id, c]));
  const slotOf = (
    it: DerivedLine | DerivedSlot,
    role: string,
    stack: readonly string[],
    optional: boolean,
  ): DishSlot[] => {
    const ref = it.ref;
    if (ref === undefined) return [];
    if (ref.kind === 'component') {
      const c = byId.get(ref.id);
      if (c === undefined || stack.includes(c.id)) return [];
      return c.lines.flatMap((l) => slotOf(l, role, [...stack, c.id], optional));
    }
    return [
      {
        role,
        ref,
        ...(it.amount === undefined ? {} : { amount: it.amount }),
        ...(optional ? { optional: true } : {}),
      },
    ];
  };
  return derived.dish.slots.flatMap((s) => slotOf(s, s.role, [], s.optional === true));
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
    const derived = deriveClassic(classic, {
      lang: language,
      ...(portions === undefined ? {} : { portions }),
    });
    if (!derived.ok) return { ok: false, error: { code: derived.error.code, classic: classic.id } };
    const names = [...(classic.components ?? []).flatMap((c) => c.lines), ...classic.slots].flatMap(
      (l) => (l.wanted === undefined || isWater(l.wanted) ? [] : [pickText(l.wanted, language)]),
    );
    const date = '1970-01-01';
    const dish: MakeableDish = {
      id: classic.id,
      version: { family: classic.id, date },
      name: derived.dish.name,
      slots: flatSlots(derived),
    };
    const found = makeable({ ...rest, dishes: [dish] });
    if (!found.ok) {
      return {
        ok: false,
        error: { code: found.error.code, classic: classic.id, error: found.error },
      };
    }
    for (const candidate of found.candidates) {
      if (candidate.kind === 'dish') out.push({ candidate, classic, names: [...new Set(names)] });
    }
  }
  const order = new Map(rank(out.map((o) => o.candidate)).map((c, i) => [c.id, i]));
  const sorted = [...out].sort(
    (a, b) => (order.get(a.candidate.id) ?? 0) - (order.get(b.candidate.id) ?? 0),
  );
  return {
    ok: true,
    candidates: sorted.map(({ candidate, classic, names }) => ({
      ...candidate,
      kind: 'classic',
      country: classic.country,
      course: classic.course,
      vegetarian: classic.vegetarian,
      notInCatalogue: names,
    })),
  };
}
