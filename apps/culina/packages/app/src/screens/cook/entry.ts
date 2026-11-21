// One entry of "what can I cook": the name, a quiet line (the origin where both origins are in the
// list, the cuisine of a shipped dish, or the kind of a component or ratio card), "complete" or
// "lacks 1" as text, why it is ranked there, what it lacks, what would stand in, where an amount
// is not known, the offers for the open roles of an own dish, and for a shipped dish the lines
// the catalogue does not have yet. The whole entry is one link; it holds only text.
import type { Origin } from '../../browse/entry';
import { classicRow } from '../../cook/classic-rows';
import type { Found } from '../../cook/finder';
import { originOf } from '../../cook/one-list';
import type { AnyCandidate } from '../../cook/one-list';
import { cookRow } from '../../cook/rows';
import type { CookRow } from '../../cook/rows';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { cuisineLabel } from '../dish-filter';

const t = strings.cook;

type Ok = Extract<Found, { ok: true }>;

/** An entry as text, with what the screen adds to the engine's candidate. */
export interface EntryRow extends CookRow {
  origin: Origin;
  /** The shipped dish's country. */
  cuisine?: string;
  /** Lines the catalogue lacks (shipped only); not counted. */
  notInCatalogue: string[];
}

/** The row of a candidate of either finder. */
export const rowOf = (c: AnyCandidate, found: Ok): EntryRow => {
  if (c.kind === 'classic') {
    const row = classicRow(c, found.classicLook);
    return { ...row, origin: 'shipped', cuisine: c.country };
  }
  return { ...cookRow(c, found.look, found.offers), origin: originOf(c), notInCatalogue: [] };
};

const note = (className: string, text: string): HTMLElement =>
  el('span', `entry-meta cook-note ${className}`, text);

/**
 * @param row - The entry as text.
 * @param dish - True in the dish group: the quiet line names origin and cuisine, not the kind.
 * @param mixed - True when both origins are in the dish group, so the origin word is said.
 */
export const cookEntry = (row: EntryRow, dish: boolean, mixed: boolean): HTMLElement => {
  const item = el('li', 'cook-entry');
  item.dataset.key = row.key;
  item.dataset.kind = row.kind;
  item.dataset.id = row.id;
  item.dataset.origin = row.origin;
  const link = el('a', 'entry-row row-link cook-link');
  link.href = row.href;
  const head = el('span', 'cook-head');
  head.append(el('span', 'entry-name', row.name));
  const quiet = dish
    ? [
        ...(mixed ? [t.originWord[row.origin]] : []),
        ...(row.cuisine === undefined ? [] : [cuisineLabel(row.cuisine)]),
      ].join(' · ')
    : t.kind[row.kind];
  if (quiet !== '') head.append(el('span', 'entry-meta cook-kind', quiet));
  head.append(el('span', 'entry-meta cook-status', row.status));
  link.append(head, note('cook-reason', row.reason));
  if (row.lacks.length > 0)
    link.append(note('cook-lacks', `${t.lacksHeading}: ${row.lacks.join(', ')}`));
  for (const text of row.substitutions) link.append(note('cook-substitution', text));
  for (const text of row.unknown) link.append(note('cook-unknown', text));
  for (const text of row.offers) link.append(note('cook-offer', text));
  if (row.notInCatalogue.length > 0)
    link.append(note('cook-uncatalogued', t.notInCatalogue(row.notInCatalogue.join(', '))));
  item.append(link);
  return item;
};
