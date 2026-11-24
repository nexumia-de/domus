// How the open entries are shown on this device: which urgencies, and in which order. A display
// choice kept in the prefs of the device; it never changes an entry or the shared order rules
// (docs/behaviour.md#filter-and-sort). `store` is rule 1 of the engine, the others are plain
// orders of the same entries.
import { homeOrder } from '@emptio/engine';
import { PRIORITIES, compareText, sortKey, type Entry, type Priority } from '@nexumia-de/list';

export const SORTS = ['store', 'urgency', 'name', 'added'] as const;
export type Sort = (typeof SORTS)[number];

export interface View {
  /** The urgencies shown; the others are counted, not listed. */
  shown: readonly Priority[];
  sort: Sort;
}

export const DEFAULT_VIEW: View = { shown: ['now', 'soon'], sort: 'store' };

export const sortOf = (value: unknown): Sort => SORTS.find((s) => s === value) ?? 'store';

/** The stored text of the shown urgencies ("now,soon"); unknown or absent gives the default. */
export function shownOf(value: string | null): readonly Priority[] {
  if (value === null) return DEFAULT_VIEW.shown;
  const parts = value.split(',');
  return PRIORITIES.filter((step) => parts.includes(step));
}

export const shownText = (shown: readonly Priority[]): string => shown.join(',');

/** How many open entries each urgency has, shown or not. */
export function countsOf(open: readonly Entry[]): Record<Priority, number> {
  const counts: Record<Priority, number> = { now: 0, soon: 0, sometime: 0 };
  for (const entry of open) counts[entry.priority] += 1;
  return counts;
}

const byName = (a: Entry, b: Entry): number =>
  compareText(sortKey(a.name), sortKey(b.name)) || compareText(a.id, b.id);

/**
 * The open entries of the shown urgencies in the chosen order. `store` and `urgency` group by
 * urgency (the screen draws the sections); `name` and `added` are one flat list.
 */
export function arrange(
  entries: readonly Entry[],
  view: View,
  categoryOrder: readonly string[],
): Entry[] {
  const open = entries.filter((e) => e.bought === undefined && view.shown.includes(e.priority));
  switch (view.sort) {
    case 'store':
      return homeOrder(open, categoryOrder);
    case 'urgency':
      return [...open].sort(
        (a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || byName(a, b),
      );
    case 'name':
      return [...open].sort(byName);
    case 'added':
      return [...open].sort((a, b) => compareText(b.addedAt, a.addedAt) || compareText(a.id, b.id));
  }
}

/** Whether the screen draws one section per urgency (and per category for `store`). */
export const grouped = (sort: Sort): boolean => sort === 'store' || sort === 'urgency';
