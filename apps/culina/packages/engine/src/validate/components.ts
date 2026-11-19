// Component references: the template, every line's ingredient or component,
// cycles through nested components (by ids only, see graph.ts) and the version.
import { checkRef, cyclesByFirst, finding, firstOccurrences } from './common';
import type { Known } from './common';
import { findCycles } from './graph';
import type { Finding, ModelComponent } from './types';
import { versionChecker } from './version';

/** Findings of the component list, in record order. */
export function componentFindings(records: readonly ModelComponent[], known: Known): Finding[] {
  const unique = firstOccurrences(records);
  const byId = new Map(unique.map((c) => [c.id, c]));
  const subs = (id: string): string[] =>
    (byId.get(id)?.lines ?? []).filter((l) => l.ref.kind === 'component').map((l) => l.ref.id);
  const cycles = cyclesByFirst(
    findCycles(
      unique.map((c) => c.id),
      subs,
    ),
  );
  const version = versionChecker('component', records);
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const c of records) {
    if (seen.has(c.id)) {
      out.push(finding('duplicate-id', 'component', c.id));
      continue;
    }
    seen.add(c.id);
    if (c.templateId !== undefined && !known.templates.has(c.templateId)) {
      out.push(
        finding('unknown-template', 'component', c.id, { path: 'templateId', ref: c.templateId }),
      );
    }
    c.lines.forEach((line, i) =>
      out.push(...checkRef(known, 'component', c.id, line.ref, `lines[${i}].ref`)),
    );
    for (const ids of cycles.get(c.id) ?? []) {
      const at = c.lines.findIndex((l) => l.ref.kind === 'component' && l.ref.id === ids[1]);
      out.push(finding('cycle', 'component', c.id, { path: `lines[${at}].ref`, ids }));
    }
    out.push(...version(c));
  }
  return out;
}
