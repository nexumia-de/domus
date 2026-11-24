// What the stock allows: components, dishes and ratio templates that are makeable fully or
// partly, with substitution, ranked by urgency then roles covered. Pure: today comes in.
import { familyHeads } from '../versions/chain';
import { summarize } from './candidate';
import { buildContext } from './context';
import type { Context } from './context';
import { evaluateLines } from './evaluate';
import type { Fail, LineSpec } from './evaluate';
import { rank, useUpFirst } from './rank';
import { templateCandidates } from './template';
import type {
  MakeableCandidate,
  MakeableComponent,
  MakeableDish,
  MakeableError,
  MakeableInput,
  MakeableLineReport,
  MakeableResult,
} from './types';

export { rank as rankCandidates } from './rank';
export { KITCHEN_ROLE } from './context';
export type { RankedCandidate } from './rank';
export { stockForRole } from './for-role';
export { usesIngredient } from './uses';
export type { UsesIngredientResult } from './uses';
export * from './types';

/** The roles a dish is asked to fill; starch is often there but never invited. */
export const DEFAULT_DISH_ROLES: readonly string[] = ['main', 'sauce', 'crunch', 'acid', 'garnish'];

/** The roles of `dishRoles` that none of the slot roles covers, in the order of `dishRoles`. */
export const openDishRoles = (
  slotRoles: readonly string[],
  dishRoles: readonly string[] = DEFAULT_DISH_ROLES,
): string[] => dishRoles.filter((r) => !slotRoles.includes(r));

const componentSpecs = (c: MakeableComponent): LineSpec[] =>
  c.lines.map((l, index) => ({
    index,
    ref: l.ref,
    ...(l.amount !== undefined && l.amount.unit !== 'percent' ? { amount: l.amount } : {}),
    ...(l.role !== undefined ? { role: l.role } : {}),
    ...(l.state !== undefined ? { state: l.state } : {}),
    optional: l.optional === true,
  }));

const dishSpecs = (d: MakeableDish): LineSpec[] =>
  d.slots.map((s, index) => ({
    index,
    ref: s.ref,
    ...(s.amount !== undefined ? { amount: s.amount } : {}),
    role: s.role,
    optional: s.optional === true,
  }));

type Listed = { ok: true; candidates: MakeableCandidate[] } | Fail;

function records(
  ctx: Context,
  kind: 'component' | 'dish',
  list: readonly (MakeableComponent | MakeableDish)[],
  maxMissing: number,
  dishRoles: readonly string[],
): Listed {
  const out: MakeableCandidate[] = [];
  for (const record of familyHeads(list)) {
    const specs =
      kind === 'component'
        ? componentSpecs(record as MakeableComponent)
        : dishSpecs(record as MakeableDish);
    const evaluated = evaluateLines(ctx, specs, [record.id]);
    if (!evaluated.ok) return evaluated;
    const candidate = summarize(
      ctx,
      { kind, id: record.id, name: record.name },
      evaluated.reports,
      maxMissing,
    );
    if (candidate === undefined) continue;
    out.push(
      kind === 'dish'
        ? {
            ...candidate,
            openRoles: openDishRoles(
              (record as MakeableDish).slots.map((s) => s.role),
              dishRoles,
            ),
          }
        : candidate,
    );
  }
  return { ok: true, candidates: out };
}

/**
 * @param input - Ingredients (the tree), components, dishes, ratio templates, stock, `today`,
 *   optional facts for unit conversion and options (`siblingSubstitution`, `maxMissing`,
 *   `dishRoles`).
 * @returns Candidates in ranking order (urgency, roles covered, name, id) with a reason per
 *   line, and the stock items to use up first; or `invalid-tree`, `invalid-date`, `cycle` or
 *   `invalid-template`. Only the head version of each family is a candidate.
 */
export function makeable(input: MakeableInput): MakeableResult {
  const built = buildContext(input);
  if (!built.ok) return built;
  const { ctx } = built;
  const maxMissing = input.options?.maxMissing ?? 0;
  const dishRoles = input.options?.dishRoles ?? DEFAULT_DISH_ROLES;
  const parts = [
    records(ctx, 'component', input.components ?? [], maxMissing, dishRoles),
    records(ctx, 'dish', input.dishes ?? [], maxMissing, dishRoles),
    templateCandidates(ctx, input.templates ?? [], maxMissing),
  ];
  const all: MakeableCandidate[] = [];
  for (const part of parts) {
    if (!part.ok) return part;
    all.push(...part.candidates);
  }
  const candidates = rank(all);
  return { ok: true, candidates, useUpFirst: useUpFirst(ctx, candidates) };
}

export type DishReportResult =
  | { ok: true; name: string; lines: MakeableLineReport[] }
  | { ok: false; error: MakeableError | { code: 'unknown-dish' } };

/**
 * Every slot of one dish against the stock, judged as `makeable` judges it, but without its rule
 * for what is listed (a dish with nothing in stock is reported too): what the hand-over to the
 * shopping list reads.
 *
 * @param input - As for `makeable`; `dishes` holds the dish, `components` what its slots name.
 * @param dishId - The id of the dish.
 * @returns The dish's name and a report per slot; or the error of the tree or a cycle, or
 *   `unknown-dish`.
 */
export function dishReport(input: MakeableInput, dishId: string): DishReportResult {
  const dish = (input.dishes ?? []).find((d) => d.id === dishId);
  if (dish === undefined) return { ok: false, error: { code: 'unknown-dish' } };
  const built = buildContext(input);
  if (!built.ok) return built;
  const evaluated = evaluateLines(built.ctx, dishSpecs(dish), [dish.id]);
  if (!evaluated.ok) return evaluated;
  return { ok: true, name: dish.name, lines: evaluated.reports };
}
