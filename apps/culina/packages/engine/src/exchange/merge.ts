// Merging a file into the notebook, by id. The rule (docs/behaviour.md, Import): a record whose
// id the notebook does not have is added; one that is identical is left alone; one that differs
// is a conflict and the user decides. "Newer wins" is never assumed. A stored version record
// (component, dish) is immutable, so its conflicts can only keep the notebook's record.
import { EXPORT_KINDS, type ExportKind, type ExportRecord, type FullRecordSets } from './types';

export const IMMUTABLE_KINDS: readonly ExportKind[] = ['components', 'dishes'];

export interface Conflict {
  kind: ExportKind;
  id: string;
  mine: ExportRecord;
  theirs: ExportRecord;
  /** A version record: only "keep mine" is possible. */
  immutable: boolean;
}

export interface MergePlan {
  /** Records of the file the notebook does not have. */
  add: FullRecordSets;
  /** Records the notebook has with the same content, per kind. */
  same: Record<ExportKind, number>;
  conflicts: Conflict[];
  /** Tasting notes left out because the version they refer to is in conflict. */
  skippedNotes: string[];
}

export type Choice = 'mine' | 'theirs';

/** The key a conflict is chosen by. */
export const conflictKey = (c: Pick<Conflict, 'kind' | 'id'>): string => `${c.kind}/${c.id}`;

/** JSON with object keys sorted, so two records with the same content give the same text. */
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const sameRecord = (a: ExportRecord, b: ExportRecord): boolean =>
  canonical(a) === canonical(b);

const empty = (): FullRecordSets => ({
  ingredients: [],
  templates: [],
  components: [],
  dishes: [],
  affinities: [],
  tastings: [],
  skills: [],
  cooked: [],
  favourites: [],
});

/**
 * @param mine - The notebook's live records.
 * @param file - The file's records.
 */
export function planMerge(mine: FullRecordSets, file: FullRecordSets): MergePlan {
  const plan: MergePlan = {
    add: empty(),
    same: Object.fromEntries(EXPORT_KINDS.map((k) => [k, 0])) as Record<ExportKind, number>,
    conflicts: [],
    skippedNotes: [],
  };
  const held = new Set<string>();
  for (const kind of EXPORT_KINDS) {
    const have = new Map(mine[kind].map((r) => [r.id, r]));
    for (const theirs of file[kind]) {
      const ours = have.get(theirs.id);
      if (ours === undefined) plan.add[kind].push(theirs);
      else if (sameRecord(ours, theirs)) plan.same[kind]++;
      else {
        plan.conflicts.push({
          kind,
          id: theirs.id,
          mine: ours,
          theirs,
          immutable: IMMUTABLE_KINDS.includes(kind),
        });
        if (IMMUTABLE_KINDS.includes(kind)) held.add(theirs.id);
      }
    }
  }
  const kept = plan.add.tastings.filter((n) => !held.has((n.ref as { id: string }).id));
  plan.skippedNotes = plan.add.tastings.filter((n) => !kept.includes(n)).map((n) => n.id);
  plan.add.tastings = kept;
  return plan;
}

/**
 * The records to write for a plan: everything added, plus the file's version of every conflict
 * the user chose "theirs" for. A version record always stays the notebook's.
 *
 * @param choices - Per conflict key; a conflict without a choice keeps the notebook's record.
 */
export function mergeWrites(
  plan: MergePlan,
  choices: ReadonlyMap<string, Choice>,
): { kind: ExportKind; record: ExportRecord }[] {
  const writes: { kind: ExportKind; record: ExportRecord }[] = [];
  for (const kind of EXPORT_KINDS) {
    for (const record of plan.add[kind]) writes.push({ kind, record });
  }
  for (const c of plan.conflicts) {
    if (!c.immutable && choices.get(conflictKey(c)) === 'theirs') {
      writes.push({ kind: c.kind, record: c.theirs });
    }
  }
  return writes;
}
