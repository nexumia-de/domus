// Dish references: every slot's ingredient or component, and the version.
import { checkRef, finding } from './common';
import type { Known } from './common';
import type { Finding, ModelDish } from './types';
import { versionChecker } from './version';

/** Findings of the dish list, in record order. */
export function dishFindings(records: readonly ModelDish[], known: Known): Finding[] {
  const version = versionChecker('dish', records);
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const d of records) {
    if (seen.has(d.id)) {
      out.push(finding('duplicate-id', 'dish', d.id));
      continue;
    }
    seen.add(d.id);
    d.slots.forEach((slot, i) =>
      out.push(...checkRef(known, 'dish', d.id, slot.ref, `slots[${i}].ref`)),
    );
    out.push(...version(d));
  }
  return out;
}
