// One entry of "what can I cook": the name, "complete" or "lacks 1" as text, why it is ranked
// there, what it lacks, what would stand in, where an amount is not known, and the offers for
// the open roles of a dish. The whole entry is one link to the recipe; it holds only text.
import { el } from '../../shell/el';
import { strings } from '../../strings';
import type { CookRow } from '../../cook/rows';

const t = strings.cook;

const note = (className: string, text: string): HTMLElement =>
  el('span', `entry-meta cook-note ${className}`, text);

export const cookEntry = (row: CookRow): HTMLElement => {
  const item = el('li', 'cook-entry');
  item.dataset.key = row.key;
  item.dataset.kind = row.kind;
  item.dataset.id = row.id;
  const link = el('a', 'entry-row row-link cook-link');
  link.href = row.href;
  const head = el('span', 'cook-head');
  head.append(
    el('span', 'entry-name', row.name),
    el('span', 'entry-meta cook-kind', t.kind[row.kind]),
    el('span', 'entry-meta cook-status', row.status),
  );
  link.append(head, note('cook-reason', row.reason));
  if (row.lacks.length > 0)
    link.append(note('cook-lacks', `${t.lacksHeading}: ${row.lacks.join(', ')}`));
  for (const text of row.substitutions) link.append(note('cook-substitution', text));
  for (const text of row.unknown) link.append(note('cook-unknown', text));
  for (const text of row.offers) link.append(note('cook-offer', text));
  item.append(link);
  return item;
};
