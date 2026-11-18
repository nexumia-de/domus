// Resolves a derivative template against its parents into effective parts.
import type {
  EffectivePart,
  EffectiveTemplate,
  PartRange,
  RatioTemplate,
  ResolveResult,
  TemplateError,
} from './types';

type Fail = { ok: false; error: TemplateError };

const fail = (error: TemplateError): Fail => ({ ok: false, error });
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Whether a range is finite, not negative and min is not above max. */
function validRange(range: PartRange): boolean {
  const { min, max } = range;
  return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= 0 && min <= max;
}

/** The effective parts of a root, or the error in its data. */
function rootParts(root: RatioTemplate): EffectivePart[] | Fail {
  const out: EffectivePart[] = [];
  for (const p of root.parts ?? []) {
    if (!positive(p.parts))
      return fail({ code: 'invalid-parts', templateId: root.id, role: p.role });
    if (p.range !== undefined && !validRange(p.range)) {
      return fail({ code: 'invalid-range', templateId: root.id, role: p.role });
    }
    if (out.some((o) => o.role === p.role)) {
      return fail({ code: 'duplicate-role', templateId: root.id, role: p.role });
    }
    out.push({ role: p.role, parts: p.parts, ...(p.range ? { range: { ...p.range } } : {}) });
  }
  return out;
}

/** Applies one derivative's changes in order; the error names the template and role. */
function applyChanges(parts: EffectivePart[], t: RatioTemplate): EffectivePart[] | Fail {
  let current = parts;
  for (const change of t.changes ?? []) {
    const at = current.findIndex((p) => p.role === change.role);
    const where = { templateId: t.id, role: change.role };
    if (change.op === 'add') {
      if (!positive(change.parts)) return fail({ code: 'invalid-parts', ...where });
      if (at >= 0) return fail({ code: 'role-exists', ...where });
      current = [...current, { role: change.role, parts: change.parts }];
    } else if (at < 0) {
      return fail({ code: 'unknown-role', ...where });
    } else if (change.op === 'remove') {
      current = current.filter((_, i) => i !== at);
    } else {
      current = current.map((p, i) =>
        i === at ? { ...p, ingredientClass: change.ingredientClass } : p,
      );
    }
  }
  return current;
}

/** The chain from the template up to its root (template first), or the error. */
function chainOf(byId: Map<string, RatioTemplate>, id: string): RatioTemplate[] | Fail {
  const chain: RatioTemplate[] = [];
  const seen: string[] = [];
  let at: RatioTemplate | undefined = byId.get(id);
  if (at === undefined) return fail({ code: 'unknown-template', templateId: id });
  while (at !== undefined) {
    if (seen.includes(at.id))
      return fail({ code: 'cycle', templateId: id, path: [...seen, at.id] });
    seen.push(at.id);
    chain.push(at);
    if (at.parentId === undefined) break;
    const parent = byId.get(at.parentId);
    if (parent === undefined) {
      return fail({ code: 'unknown-parent', templateId: at.id, parentId: at.parentId });
    }
    at = parent;
  }
  return chain;
}

/**
 * Resolves a template against its parents: the root's parts, then each
 * derivative's changes in order from the root down. Ranges stay with their
 * part; a `swap` sets the part's `ingredientClass` and keeps parts and
 * range. The anchor is the nearest one defined from the template up.
 *
 * @param templates - Every template in the set, in the stored shape.
 * @param id - The template to resolve.
 * @returns The effective template (roles in root order, added roles last, lineage root first), or an error about the template data: `duplicate-id`, `unknown-template`, `unknown-parent`, `cycle` (with `path`), `not-root-or-derivative`, `invalid-parts`, `invalid-range`, `duplicate-role`, `role-exists`, `unknown-role` or `anchor-removed`.
 */
export function resolveTemplate(templates: readonly RatioTemplate[], id: string): ResolveResult {
  const byId = new Map<string, RatioTemplate>();
  for (const t of templates) {
    if (byId.has(t.id)) return fail({ code: 'duplicate-id', templateId: t.id });
    byId.set(t.id, t);
  }
  const chain = chainOf(byId, id);
  if (!Array.isArray(chain)) return chain;
  const fromRoot = [...chain].reverse();
  let parts: EffectivePart[] = [];
  for (const t of fromRoot) {
    const isRoot = t.parentId === undefined;
    const shapeOk = isRoot
      ? t.parts !== undefined && t.changes === undefined
      : t.changes !== undefined && t.parts === undefined;
    if (!shapeOk) return fail({ code: 'not-root-or-derivative', templateId: t.id });
    const next = isRoot ? rootParts(t) : applyChanges(parts, t);
    if (!Array.isArray(next)) return next;
    parts = next;
  }
  const anchor = chain.find((t) => t.anchor !== undefined)?.anchor;
  if (anchor !== undefined && !parts.some((p) => p.role === anchor)) {
    return fail({ code: 'anchor-removed', templateId: id, role: anchor });
  }
  const template: EffectiveTemplate = {
    id,
    ...(anchor !== undefined ? { anchor } : {}),
    parts,
    lineage: fromRoot.map((t) => t.id),
  };
  return { ok: true, template };
}
