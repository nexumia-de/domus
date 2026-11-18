// The slots table of a dish: role and filling (a link for a component), the amount per portion and
// the total for the chosen portions. An open role is a quiet invitation row, not an error.
import type { OpenRow, SlotRow } from '../dishes/slots';
import { hashFor } from '../router';
import { formatMass } from '../shared/mass';
import { el } from '../shell/el';
import { strings } from '../strings';
import { dataTable, type Cell } from './table';

const filling = (row: SlotRow): Cell => {
  const box = el('span', 'slot-filling');
  box.append(el('span', 'slot-role', row.roleLabel));
  if (row.linked) {
    const a = el('a', 'line-link', row.name);
    a.href = hashFor('components', row.id);
    box.append(a);
  } else box.append(el('span', 'slot-name', row.name));
  if (row.optional) box.append(el('span', 'line-extra', strings.dishes.optional));
  if (row.problem !== undefined && row.perPortionG === undefined) {
    box.append(el('span', 'line-extra', row.problem));
  }
  return { content: box, header: true };
};

const amount = (g: number | undefined): Cell => ({
  content: g === undefined ? '' : formatMass(g, 'g'),
  num: true,
});

export const slotsSection = (rows: readonly SlotRow[], open: readonly OpenRow[]): HTMLElement => {
  const section = el('section', 'slots');
  section.append(el('h2', undefined, strings.dishes.slotsHeading));
  const cells: Cell[][] = rows.map((row) => [
    filling(row),
    amount(row.perPortionG),
    amount(row.totalG),
  ]);
  for (const slot of open) {
    cells.push([{ content: el('span', 'slot-invite', slot.text), span: 3 }]);
  }
  const table = dataTable(
    'slots-table',
    [
      { text: strings.dishes.colFilling },
      { text: strings.dishes.colPerPortion, num: true },
      { text: strings.dishes.colTotal, num: true },
    ],
    cells,
    cells.map((_, i) => (i >= rows.length ? 'slot-open' : undefined)),
  );
  section.append(table);
  return section;
};
