// Affinity references: both ends of the pair are ingredients.
import { checkIngredientId, finding } from './common';
import type { Known } from './common';
import type { Finding, ModelAffinity } from './types';

/** Findings of the affinity list, in record order. */
export function affinityFindings(records: readonly ModelAffinity[], known: Known): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const a of records) {
    if (seen.has(a.id)) {
      out.push(finding('duplicate-id', 'affinity', a.id));
      continue;
    }
    seen.add(a.id);
    out.push(...checkIngredientId(known, 'affinity', a.id, a.a, 'a'));
    out.push(...checkIngredientId(known, 'affinity', a.id, a.b, 'b'));
  }
  return out;
}
