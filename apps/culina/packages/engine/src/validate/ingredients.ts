// Ingredient tree: unknown parents and cycles come from materia's `buildTree`
// (general, shared with Mixtura); this maps its errors to findings. Duplicate
// ids are reported here in record order.
import { buildTree } from '../model';
import { cyclesByFirst, finding } from './common';
import type { Finding, ModelIngredient } from './types';

/** Findings of the ingredient list, in record order. */
export function ingredientFindings(records: readonly ModelIngredient[]): Finding[] {
  // Culina's ingredients have no `level`; one level for all makes materia's
  // level-order check unreachable, so only references and cycles are found.
  const tree = buildTree(
    records.map((r) => ({
      id: r.id,
      name: r.id,
      level: 'type' as const,
      ...(r.parentId !== undefined ? { parentId: r.parentId } : {}),
    })),
  );
  const missing = new Map<string, string>();
  const rings: string[][] = [];
  for (const e of tree.ok ? [] : tree.errors) {
    if (e.code === 'missing-parent') missing.set(e.ids[0] as string, e.ids[1] as string);
    if (e.code === 'cycle') rings.push(e.ids);
  }
  const cycles = cyclesByFirst(rings);
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const { id } of records) {
    if (seen.has(id)) {
      out.push(finding('duplicate-id', 'ingredient', id));
      continue;
    }
    seen.add(id);
    const parent = missing.get(id);
    if (parent !== undefined) {
      out.push(finding('unknown-parent', 'ingredient', id, { path: 'parentId', ref: parent }));
    }
    for (const ids of cycles.get(id) ?? []) {
      out.push(finding('cycle', 'ingredient', id, { path: 'parentId', ids }));
    }
  }
  return out;
}
