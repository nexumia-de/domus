// The view logic of the history screen: the versions of one family newest first, each with
// its diff to the version before and the tasting notes made on it. No state, no DOM.
import {
  diffComponentVersions,
  diffDishVersions,
  versionFamily,
  type DiffComponent,
  type DiffDish,
  type VersionDiff,
} from '@culina/engine';
import type { ComponentRecord, DishRecord, TastingRecord } from '../records';

export interface HistoryEntry<R> {
  record: R;
  /** The first version is 1. */
  number: number;
  isHead: boolean;
  /** Against the version before; undefined for the first version. */
  diff: VersionDiff | undefined;
  notes: TastingRecord[];
}

type Rec = ComponentRecord | DishRecord;

const diffOf = (
  before: Rec,
  after: Rec,
  kind: 'components' | 'dishes',
): VersionDiff | undefined => {
  const result =
    kind === 'components'
      ? diffComponentVersions(before as DiffComponent, after as DiffComponent)
      : diffDishVersions(before as DiffDish, after as DiffDish);
  return result.ok ? result.diff : undefined;
};

/** Newest first. `records` holds every live record of the kind, `tastings` every note. */
export const historyEntries = <R extends Rec>(
  kind: 'components' | 'dishes',
  records: readonly R[],
  tastings: readonly TastingRecord[],
  id: string,
): HistoryEntry<R>[] => {
  const family = versionFamily(records, id);
  if (!family.ok) return [];
  const { versions, head } = family;
  return versions
    .map((record, index): HistoryEntry<R> => {
      const before = versions[index - 1];
      return {
        record,
        number: index + 1,
        isHead: record.id === head.id,
        diff: before === undefined ? undefined : diffOf(before, record, kind),
        notes: tastings
          .filter((t) => t.ref.id === record.id)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1)),
      };
    })
    .reverse();
};

/** A date as typed: `YYYY-MM-DD` and a real calendar day. */
export const isDate = (text: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m === null) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = [
    31,
    y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= (days[mo - 1] as number);
};
