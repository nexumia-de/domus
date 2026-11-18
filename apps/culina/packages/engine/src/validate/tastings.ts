// Tasting-note references: the version record the note was made on, a
// component or a dish.
import { finding } from './common';
import type { Known } from './common';
import type { Finding, ModelTasting } from './types';

/** Findings of the tasting list, in record order. */
export function tastingFindings(records: readonly ModelTasting[], known: Known): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const t of records) {
    if (seen.has(t.id)) {
      out.push(finding('duplicate-id', 'tasting', t.id));
      continue;
    }
    seen.add(t.id);
    const isDish = t.ref.kind === 'dish';
    if (!(isDish ? known.dishes : known.components).has(t.ref.id)) {
      const code = isDish ? 'unknown-dish' : 'unknown-component';
      out.push(finding(code, 'tasting', t.id, { path: 'ref', ref: t.ref.id }));
    }
  }
  return out;
}
