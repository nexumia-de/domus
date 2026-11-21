// The ranking contract and "use up first". MakeableUrgency first (earliest use-by; none is last), then
// more distinct roles covered, then name and id as plain string comparison. No score.
import type { Context } from './context';
import type { MakeableCandidate, MakeableUseUp } from './types';

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * What the ranking reads of a candidate. The finder's own candidates and the shipped classics
 * (`classicsMakeable`) both carry it, so one list of both is ordered by the same contract.
 */
export interface RankedCandidate {
  kind: string;
  id: string;
  name: string;
  roles: readonly string[];
  urgency?: { daysLeft: number };
}

/**
 * Candidates in ranking order: urgency (fewest days left first, none last), more distinct roles
 * covered, then name, id and kind as plain string comparison. A total order: the result does not
 * depend on the order of the input, so the union of two ranked lists ranked again is the merge of
 * both by the same rule.
 */
export function rank<T extends RankedCandidate>(candidates: readonly T[]): T[] {
  return [...candidates].sort(
    (a, b) =>
      (a.urgency?.daysLeft ?? Infinity) - (b.urgency?.daysLeft ?? Infinity) ||
      b.roles.length - a.roles.length ||
      cmp(a.name, b.name) ||
      cmp(a.id, b.id) ||
      cmp(a.kind, b.kind),
  );
}

/**
 * Stock items with a use-by date, earliest first (then id), with the candidates that use each.
 * Always-there items and items without a date are left out; an item no candidate uses is kept.
 */
export function useUpFirst(ctx: Context, ranked: readonly MakeableCandidate[]): MakeableUseUp[] {
  return ctx.items
    .filter((i) => i.always !== true && i.day !== undefined)
    .sort((a, b) => (a.day as number) - (b.day as number) || cmp(a.id, b.id))
    .map((i) => ({
      itemId: i.id,
      useBy: i.useBy as string,
      daysLeft: (i.day as number) - ctx.today,
      candidates: ranked
        .filter((c) => c.usedItems.includes(i.id))
        .map((c) => ({ kind: c.kind, id: c.id })),
    }));
}
