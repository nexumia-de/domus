// What we settled: every settled line and the number of persons has an entry, and every entry points at something.
// A settled line or slot needs no amount: without one the entry records a choice ("water, not broth").
import { found } from '../content/types';
import type { ContentFinding } from '../content/types';
import type { Classic } from './types';

/** The target name of a settled line or slot, or `undefined` when it has no key. */
const target = (owner: string, key: string | undefined): string | undefined =>
  key === undefined ? undefined : `${owner}/${key}`;

/** Findings about `settled` entries, settled lines and settled persons. */
export function settledFindings(classic: Classic): ContentFinding[] {
  const out: ContentFinding[] = [];
  const marked = new Set<string>();
  const check = (path: string, owner: string, item: { key?: string; settled?: true }): void => {
    if (item.settled !== true) return;
    const name = target(owner, item.key);
    if (name !== undefined) marked.add(name);
    const entry = name !== undefined && classic.settled.some((s) => s.target === name);
    if (!entry) out.push(found('settled-without-entry', path, name));
  };
  (classic.components ?? []).forEach((c, i) =>
    c.lines.forEach((line, j) => check(`components[${i}].lines[${j}]`, c.id, line)),
  );
  classic.slots.forEach((slot, i) => check(`slots[${i}]`, 'slots', slot));

  let persons = false;
  classic.settled.forEach((entry, i) => {
    if (entry.target === undefined) return;
    if (entry.target === 'persons') {
      persons = true;
      if (classic.persons.basis !== 'settled') {
        out.push(found('persons-entry', `settled[${i}].target`));
      }
    } else if (!marked.has(entry.target)) {
      out.push(found('settled-target', `settled[${i}].target`, entry.target));
    }
  });
  if (classic.persons.basis === 'settled' && !persons) {
    out.push(found('persons-unsettled', 'persons'));
  }
  return out;
}
