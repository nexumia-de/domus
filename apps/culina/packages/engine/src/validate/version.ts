// The references of a `version` object: family and parent are records of the
// same kind. The family is "the id of the first version" (data model, Version),
// so it must exist; a parent chain must not loop.
import { cyclesByFirst, finding, firstOccurrences } from './common';
import { findCycles } from './graph';
import type { EntityKind, Finding, ModelVersion } from './types';

interface Versioned {
  id: string;
  version?: ModelVersion;
}

/** Prepares the version checks of one kind; the returned function checks one record. */
export function versionChecker(
  kind: EntityKind,
  records: readonly Versioned[],
): (record: Versioned) => Finding[] {
  const unique = firstOccurrences(records);
  const ids = new Set(unique.map((r) => r.id));
  const parentOf = new Map(unique.map((r) => [r.id, r.version?.parent]));
  const cycles = cyclesByFirst(
    findCycles(
      unique.map((r) => r.id),
      (id) => {
        const parent = parentOf.get(id);
        return parent === undefined ? [] : [parent];
      },
    ),
  );
  return ({ id, version }) => {
    if (version === undefined) return [];
    const out: Finding[] = [];
    if (!ids.has(version.family)) {
      out.push(
        finding('unknown-family', kind, id, { path: 'version.family', ref: version.family }),
      );
    }
    if (version.parent !== undefined && !ids.has(version.parent)) {
      out.push(
        finding('unknown-parent', kind, id, { path: 'version.parent', ref: version.parent }),
      );
    }
    for (const ids of cycles.get(id) ?? []) {
      out.push(finding('cycle', kind, id, { path: 'version.parent', ids }));
    }
    return out;
  };
}
