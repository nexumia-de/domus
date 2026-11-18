// Template references and structure. Cycles and unknown parents are found by
// ids first; the rest (root or derivative, parts, ranges, changes, anchor)
// is what `resolveTemplate` already decides, mapped to findings. A template
// is resolved only when its parent chain is sound, and only its own error is
// kept: an error of an ancestor is reported with the ancestor.
import { resolveTemplate } from '../ratios/resolve';
import type { RatioTemplate, TemplateError } from '../ratios/types';
import { checkIngredientId, cyclesByFirst, finding, firstOccurrences } from './common';
import type { Known } from './common';
import { findCycles } from './graph';
import type { Finding } from './types';

const lastIndex = (items: readonly { role: string }[], role: string | undefined): number =>
  items.reduce((at, item, i) => (item.role === role ? i : at), -1);

/** Where the error's role sits: `parts[i]` or `changes[i]` (with `.range` for a range); the last match is the offending one. */
function pathOf(t: RatioTemplate, role: string | undefined, field: string): string | undefined {
  const suffix = field === 'range' ? '.range' : '';
  const inParts = lastIndex(t.parts ?? [], role);
  if (inParts >= 0) return `parts[${inParts}]${suffix}`;
  const inChanges = lastIndex(t.changes ?? [], role);
  return inChanges >= 0 ? `changes[${inChanges}]${suffix}` : undefined;
}

function fromResolve(t: RatioTemplate, error: TemplateError): Finding | undefined {
  if (error.templateId !== t.id) return undefined;
  const { code, role } = error;
  if (code === 'anchor-removed') {
    const own = t.anchor !== undefined ? { path: 'anchor' } : {};
    return finding('anchor-not-a-role', 'template', t.id, { ...own, ...(role ? { role } : {}) });
  }
  if (
    code !== 'not-root-or-derivative' &&
    code !== 'invalid-parts' &&
    code !== 'invalid-range' &&
    code !== 'duplicate-role' &&
    code !== 'role-exists' &&
    code !== 'unknown-role'
  ) {
    return undefined;
  }
  const path = pathOf(t, role, code === 'invalid-range' ? 'range' : '');
  return finding(code, 'template', t.id, {
    ...(path !== undefined ? { path } : {}),
    ...(role !== undefined ? { role } : {}),
  });
}

/** Findings of the template list, in record order. */
export function templateFindings(records: readonly RatioTemplate[], known: Known): Finding[] {
  const unique = firstOccurrences(records);
  const byId = new Map(unique.map((t) => [t.id, t]));
  const cycles = cyclesByFirst(
    findCycles(
      unique.map((t) => t.id),
      (id) => {
        const parent = byId.get(id)?.parentId;
        return parent === undefined ? [] : [parent];
      },
    ),
  );
  const sound = (t: RatioTemplate): boolean => {
    const seen = new Set<string>();
    for (let at: RatioTemplate | undefined = t; at !== undefined;) {
      if (seen.has(at.id)) return false;
      seen.add(at.id);
      if (at.parentId === undefined) return true;
      at = byId.get(at.parentId);
    }
    return false;
  };
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const t of records) {
    if (seen.has(t.id)) {
      out.push(finding('duplicate-id', 'template', t.id));
      continue;
    }
    seen.add(t.id);
    if (t.parentId !== undefined && !byId.has(t.parentId)) {
      out.push(finding('unknown-parent', 'template', t.id, { path: 'parentId', ref: t.parentId }));
    }
    for (const ids of cycles.get(t.id) ?? []) {
      out.push(finding('cycle', 'template', t.id, { path: 'parentId', ids }));
    }
    if (sound(t)) {
      const result = resolveTemplate(unique, t.id);
      const own = result.ok ? undefined : fromResolve(t, result.error);
      if (own !== undefined) out.push(own);
    }
    (t.changes ?? []).forEach((c, i) => {
      if (c.op !== 'swap') return;
      const path = `changes[${i}].ingredientClass`;
      out.push(...checkIngredientId(known, 'template', t.id, c.ingredientClass, path));
    });
  }
  return out;
}
