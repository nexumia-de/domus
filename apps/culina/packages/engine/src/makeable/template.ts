// Ratio templates against the stock. A template carries roles and parts, no amounts, so it is
// makeable when every role has an item in stock: an ingredient whose roles (own or inherited)
// include the role, or, where a derivative swapped the role to an ingredient class, an
// ingredient in that class. Nothing can be short; the user chooses the amounts.
import { isA } from '../model';
import { resolveTemplate } from '../ratios/resolve';
import type { RatioTemplate } from '../ratios/types';
import { byUseBy, rolesOf } from './context';
import type { Context, Item } from './context';
import type { Fail } from './evaluate';
import { summarize } from './candidate';
import type { MakeableCandidate, MakeableLineReport } from './types';

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
      const fits = (i: Item): boolean =>
        i.ref.kind === 'ingredient' &&
        (part.ingredientClass !== undefined
          ? isA(ctx.tree, i.refId, part.ingredientClass)
          : rolesOf(ctx, i.refId).includes(part.role));
      const fitting = ctx.items.filter(fits);
      const chosen = byUseBy(fitting.filter((i) => !i.always))[0] ?? fitting[0];
      const base = { index, role: part.role, optional: false };
      if (chosen === undefined) {
        return {
          ...base,
          ...(part.ingredientClass !== undefined
            ? { ref: { kind: 'ingredient' as const, id: part.ingredientClass } }
            : {}),
          status: 'missing',
          items: [],
        };
      }
      return {
        ...base,
        ref: { kind: 'ingredient', id: chosen.refId },
        status: 'have',
        source: 'stock',
        items: [chosen.id],
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
