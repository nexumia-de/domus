// Stock references: the ingredient or component that is in stock.
import { checkRef, finding } from './common';
import type { Known } from './common';
import type { Finding, ModelStock } from './types';

/** Findings of the stock list, in record order. */
export function stockFindings(records: readonly ModelStock[], known: Known): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const s of records) {
    if (seen.has(s.id)) {
      out.push(finding('duplicate-id', 'stock', s.id));
      continue;
    }
    seen.add(s.id);
    out.push(...checkRef(known, 'stock', s.id, s.ref, 'ref'));
  }
  return out;
}
