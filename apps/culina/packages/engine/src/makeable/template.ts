// Ratio templates against the stock. A template carries roles and parts, no amounts, so it is
// makeable when every role has an item in stock: an ingredient whose roles (own or inherited)
// include the role, or, where a derivative swapped the role to an ingredient class, an
// ingredient in that class; failing that, a group in stock above a member that plays the role
// (reported in `through`). The role water is the kitchen's. Nothing can be short; the user chooses
// the amounts.
import { isA } from '../model';
import { resolveTemplate } from '../ratios/resolve';
import type { RatioTemplate } from '../ratios/types';
import { byUseBy, KITCHEN_ROLE, rolesOf } from './context';
import type { Context } from './context';
import type { Fail } from './evaluate';
import { summarize } from './candidate';
import type { MakeableCandidate, MakeableLineReport } from './types';

/**
 * The member nearest below `groupId` (breadth first, tree order) that `fits`; undefined when none.
 * A group in stock covers a role that a member below it plays.
 */
function memberBelow(
  ctx: Context,
  groupId: string,
  fits: (id: string) => boolean,
): string | undefined {
  let level = [...(ctx.tree.children.get(groupId) ?? [])];
  const seen = new Set<string>([groupId]);
  while (level.length > 0) {
    const found = level.find(fits);
    if (found !== undefined) return found;
    const next: string[] = [];
    for (const id of level) {
      seen.add(id);
      for (const c of ctx.tree.children.get(id) ?? []) if (!seen.has(c)) next.push(c);
    }
    level = next;
  }
  return undefined;
}

/** The candidates among the templates; a template that does not resolve fails the call. */
export function templateCandidates(
  ctx: Context,
  templates: readonly RatioTemplate[],
  maxMissing: number,
): { ok: true; candidates: MakeableCandidate[] } | Fail {
  const out: MakeableCandidate[] = [];
  for (const t of templates) {
    const resolved = resolveTemplate(templates, t.id);
    if (!resolved.ok)
      return { ok: false, error: { code: 'invalid-template', cause: resolved.error } };
    const lines = resolved.template.parts.map((part, index): MakeableLineReport => {
      const base = { index, role: part.role, optional: false };
      if (part.ingredientClass === undefined && part.role === KITCHEN_ROLE) {
        return { ...base, status: 'have', source: 'kitchen', items: [] };
      }
      const fitsId = (id: string): boolean =>
        part.ingredientClass !== undefined
          ? isA(ctx.tree, id, part.ingredientClass)
          : rolesOf(ctx, id).includes(part.role);
      const fitting = ctx.items.filter((i) => i.ref.kind === 'ingredient' && fitsId(i.refId));
      const chosen = byUseBy(fitting.filter((i) => !i.always))[0] ?? fitting[0];
      if (chosen !== undefined) {
        return {
          ...base,
          ref: { kind: 'ingredient', id: chosen.refId },
          status: 'have',
          source: 'stock',
          items: [chosen.id],
        };
      }
      // A group in stock above a member that plays the role (or is in the class).
      if (ctx.group) {
        for (const item of byUseBy(ctx.items)) {
          if (item.ref.kind !== 'ingredient') continue;
          const member = memberBelow(ctx, item.refId, fitsId);
          if (member === undefined) continue;
          return {
            ...base,
            ref: { kind: 'ingredient', id: item.refId },
            status: 'have',
            source: 'stock',
            items: [item.id],
            through: { rule: 'group', asked: member, inStock: item.refId, itemId: item.id },
          };
        }
      }
      return {
        ...base,
        ...(part.ingredientClass !== undefined
          ? { ref: { kind: 'ingredient' as const, id: part.ingredientClass } }
          : {}),
        status: 'missing',
        items: [],
      };
    });
    const candidate = summarize(
      ctx,
      { kind: 'template', id: t.id, name: t.name },
      lines,
      maxMissing,
    );
    if (candidate !== undefined) out.push(candidate);
  }
  return { ok: true, candidates: out };
}
