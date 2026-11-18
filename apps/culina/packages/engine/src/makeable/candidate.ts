// Turns the lines of a component, dish or template into a candidate: lacking lines, roles
// covered, the items used and the urgency they set. No ranking here.
import type { Context } from './context';
import { lacks } from './evaluate';
import type {
  MakeableCandidate,
  MakeableLineReport,
  MakeableSubstitution,
  MakeableUrgency,
} from './types';

const there = (r: MakeableLineReport): boolean => r.status !== 'missing' && r.status !== 'short';

/** Stock items a line uses; a made sub-component uses what its own lines use. */
function usedBy(r: MakeableLineReport): string[] {
  const own = r.source === 'stock' ? r.items : [];
  return r.source === 'made' && r.parts !== undefined ? r.parts.flatMap(usedBy) : own;
}

function substitutionsOf(r: MakeableLineReport): MakeableSubstitution[] {
  const own = r.substitution === undefined ? [] : [r.substitution];
  return r.source === 'made' && r.parts !== undefined ? r.parts.flatMap(substitutionsOf) : own;
}

/** Roles of the lines that are there (a sub-component counts with the line's role, not its own). */
const rolesOf = (lines: readonly MakeableLineReport[]): string[] =>
  [...new Set(lines.filter(there).flatMap((l) => (l.role === undefined ? [] : [l.role])))].sort();

/** The used item with the earliest use-by; always-there items and items without a date never count. */
function urgencyOf(ctx: Context, used: readonly string[]): MakeableUrgency | undefined {
  let best: { id: string; day: number; useBy: string } | undefined;
  for (const id of used) {
    const item = ctx.items.find((i) => i.id === id);
    if (item === undefined || item.alwaysThere === true || item.day === undefined) continue;
    if (best === undefined || item.day < best.day || (item.day === best.day && id < best.id)) {
      best = { id, day: item.day, useBy: item.useBy as string };
    }
  }
  return best === undefined
    ? undefined
    : { useBy: best.useBy, daysLeft: best.day - ctx.today, itemId: best.id };
}

/**
 * The candidate of a line list, or undefined when it is not listed: more required lines
 * lacking than `maxMissing`, or no line at all that is there.
 */
export function summarize(
  ctx: Context,
  head: { kind: MakeableCandidate['kind']; id: string; name: string },
  lines: MakeableLineReport[],
  maxMissing: number,
): MakeableCandidate | undefined {
  const lacking = lines.filter((l) => !l.optional && lacks(l.status)).length;
  if (lacking > maxMissing || !lines.some((l) => !l.optional && there(l))) return undefined;
  const alwaysIds = new Set(ctx.items.filter((i) => i.alwaysThere === true).map((i) => i.id));
  const used = [...new Set(lines.flatMap(usedBy))].filter((id) => !alwaysIds.has(id)).sort();
  const urgency = urgencyOf(ctx, used);
  return {
    ...head,
    complete: lacking === 0,
    lacking,
    lines,
    ...(urgency !== undefined ? { urgency } : {}),
    roles: rolesOf(lines),
    usedItems: used,
    substitutions: lines.flatMap(substitutionsOf),
  };
}
