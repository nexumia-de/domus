// What an import would do, computed without touching anything: the plan is
// shown to the user and then applied as it is. Two modes
// (docs/export-format.md#import-modes):
//  - replace: the file becomes the data; records not in the file go;
//    identical records are left alone and counted as skipped.
//  - merge: add what is new; for the same key keep the existing record,
//    except a spec with a newer `updatedAt` in the file, which replaces it
//    (equal or older is skipped). The key is the `id`.
// Spec versions are never dropped by a merge: a file record that would take
// the (lineageId, version) slot of a different existing record is skipped.

import { emptySnapshot } from './build';
import { instantMs } from '@nexumia-de/materia';
import { keyOf } from './keys';
import { KINDS, type Counts, type Snapshot } from './types';

export type ImportMode = 'merge' | 'replace';

export interface Plan {
  mode: ImportMode;
  added: Counts;
  replaced: Counts;
  skipped: Counts;
  removed: Counts;
  /** Records to put (added and replaced ones). */
  writes: Snapshot;
  /** Records to delete first (replace mode only). */
  deletes: Snapshot;
}

const zero = (): Counts => ({
  ingredients: 0,
  templates: 0,
  specs: 0,
  affinities: 0,
});

const slotOf = (record: object): string => {
  const { lineageId, version } = record as { lineageId: string; version: number };
  return `${lineageId}#${version}`;
};

/** JSON with sorted keys, for comparing two records. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const newer = (incoming: object, existing: object): boolean => {
  const a = instantMs((incoming as { updatedAt?: string }).updatedAt);
  const b = instantMs((existing as { updatedAt?: string }).updatedAt);
  return a !== undefined && b !== undefined && a > b;
};

/**
 * What importing `incoming` into `current` would do, computed without touching anything.
 * @param current The user's data now.
 * @param incoming The records of the file (or of the backup an undo restores).
 * @param mode `merge` adds what is new; `replace` makes the file the data.
 * @returns The plan: counts per kind, the records to write and the records to delete.
 */
export function planImport(current: Snapshot, incoming: Snapshot, mode: ImportMode): Plan {
  const plan: Plan = {
    mode,
    added: zero(),
    replaced: zero(),
    skipped: zero(),
    removed: zero(),
    writes: emptySnapshot(),
    deletes: emptySnapshot(),
  };
  for (const kind of KINDS) {
    const existing = new Map<string, object>(
      (current[kind] as object[]).map((r) => [keyOf(kind, r), r]),
    );
    const write = plan.writes[kind] as object[];
    if (mode === 'replace') {
      const keys = new Set((incoming[kind] as object[]).map((r) => keyOf(kind, r)));
      for (const record of incoming[kind] as object[]) {
        const old = existing.get(keyOf(kind, record));
        if (old && canonical(old) === canonical(record)) {
          plan.skipped[kind]++;
          continue;
        }
        write.push(record);
        plan[old ? 'replaced' : 'added'][kind]++;
      }
      for (const [key, record] of existing) {
        if (keys.has(key)) continue;
        (plan.deletes[kind] as object[]).push(record);
        plan.removed[kind]++;
      }
      continue;
    }
    const slots = new Map<string, string>();
    if (kind === 'specs') for (const [key, r] of existing) slots.set(slotOf(r), key);
    for (const record of incoming[kind] as object[]) {
      const key = keyOf(kind, record);
      const old = existing.get(key);
      if (old) {
        const takesOver =
          kind === 'specs' && newer(record, old) && slots.get(slotOf(record)) === key;
        if (takesOver) {
          write.push(record);
          plan.replaced[kind]++;
        } else plan.skipped[kind]++;
        continue;
      }
      if (kind === 'specs' && slots.has(slotOf(record))) {
        plan.skipped[kind]++;
        continue;
      }
      if (kind === 'specs') slots.set(slotOf(record), key);
      write.push(record);
      plan.added[kind]++;
    }
  }
  return plan;
}

/** True when applying the plan changes nothing, as for a merge of a file that is already in. */
export const isNoOp = (plan: Plan): boolean =>
  KINDS.every((k) => plan.added[k] + plan.replaced[k] + plan.removed[k] === 0);
