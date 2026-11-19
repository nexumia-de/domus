// Family tree queries over the parentId links of a template set.
import type { AncestorsResult, RatioTemplate } from './types';

/**
 * The templates that derive directly from a template.
 *
 * @param templates - Every template in the set.
 * @param id - The parent's id.
 * @returns Ids of the direct children in input order; empty for an unknown id.
 */
export function templateChildren(templates: readonly RatioTemplate[], id: string): string[] {
  return templates.filter((t) => t.parentId === id).map((t) => t.id);
}

/**
 * The parents of a template, nearest first, up to the root.
 *
 * @param templates - Every template in the set.
 * @param id - The template whose ancestors are wanted.
 * @returns The ancestor ids (empty for a root), or `unknown-template`, `unknown-parent` or `cycle` (with `path`, as in `resolveTemplate`).
 */
export function templateAncestors(
  templates: readonly RatioTemplate[],
  id: string,
): AncestorsResult {
  const byId = new Map(templates.map((t) => [t.id, t] as const));
  let at = byId.get(id);
  if (at === undefined) return { ok: false, error: { code: 'unknown-template', templateId: id } };
  const path = [at.id];
  while (at.parentId !== undefined) {
    const parentId: string = at.parentId;
    if (path.includes(parentId)) {
      return { ok: false, error: { code: 'cycle', templateId: id, path: [...path, parentId] } };
    }
    const parent = byId.get(parentId);
    if (parent === undefined) {
      return { ok: false, error: { code: 'unknown-parent', templateId: at.id, parentId } };
    }
    path.push(parent.id);
    at = parent;
  }
  return { ok: true, ids: path.slice(1) };
}

/**
 * The other templates with the same parent. A root has no siblings.
 *
 * @param templates - Every template in the set.
 * @param id - The template whose siblings are wanted.
 * @returns Sibling ids in input order, without the template itself; empty for a root or an unknown id.
 */
export function templateSiblings(templates: readonly RatioTemplate[], id: string): string[] {
  const parentId = templates.find((t) => t.id === id)?.parentId;
  if (parentId === undefined) return [];
  return templates.filter((t) => t.parentId === parentId && t.id !== id).map((t) => t.id);
}
