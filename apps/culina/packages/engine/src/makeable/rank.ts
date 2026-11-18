// The ranking contract and "use up first". MakeableUrgency first (earliest use-by; none is last), then
// more distinct roles covered, then name and id as plain string comparison. No score.
import type { Context } from './context';
import type { MakeableCandidate, MakeableUseUp } from './types';

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Candidates in ranking order. */
export function rank(candidates: readonly MakeableCandidate[]): MakeableCandidate[] {
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
