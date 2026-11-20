// The slots table of a dish: role and filling (a link for a component), the amount per portion and
// the total for the chosen portions. An open role is a quiet invitation row, not an error. A slot
// with alternatives has "Swap": it opens a row with the other components of the slot's role.
import type { Candidate } from '../dishes/alternatives';
import type { OpenRow, SlotRow } from '../dishes/slots';
import { hashFor } from '../router';
import { formatMass } from '../shared/mass';
import { el } from '../shell/el';
import { strings } from '../strings';
import { dataTable, type Cell } from './table';

/** What the dish screen gives the table so that a slot can be swapped. */
export interface SwapControls {
  /** The alternatives of the slot at `index`; none for a slot that has no "Swap". */
  alternatives: (index: number) => readonly Candidate[];
  /** The slot whose alternatives are shown. */
  open?: number;
  /** The slots that show another filling than the stored one. */
  swapped: ReadonlySet<number>;
  onToggle: (index: number) => void;
  onChoose: (index: number, componentId: string) => void;
}

const filling = (row: SlotRow, index: number, swap?: SwapControls): Cell => {
  const box = el('span', 'slot-filling');
  box.append(el('span', 'slot-role', row.roleLabel));
  if (row.linked) {
    const a = el('a', 'line-link', row.name);
    a.href = hashFor('components', row.id);
    box.append(a);
  } else box.append(el('span', 'slot-name', row.name));
  if (row.optional) box.append(el('span', 'line-extra', strings.dishes.optional));
  if (swap?.swapped.has(index)) box.append(el('span', 'line-extra', strings.dishes.swapped));
  if (row.problem !== undefined && row.perPortionG === undefined) {
    box.append(el('span', 'line-extra', row.problem));
  }
  if (swap !== undefined && swap.alternatives(index).length > 0) {
    const button = el('button', 'btn quiet slot-swap', strings.dishes.swap);
    button.type = 'button';
    button.dataset.swap = String(index);
    button.setAttribute('aria-label', strings.dishes.swapFor(row.name));
    button.setAttribute('aria-expanded', String(swap.open === index));
    button.addEventListener('click', () => swap.onToggle(index));
    box.append(button);
  }
  return { content: box, header: true };
};

/** The row under a slot that is being swapped: one button per alternative. */
const choices = (row: SlotRow, index: number, swap: SwapControls): Cell => {
  const box = el('div', 'slot-choices');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', strings.dishes.swapFor(row.name));
  box.append(el('span', 'slot-choices-label', strings.dishes.swapChoose(row.name)));
  for (const candidate of swap.alternatives(index)) {
    const button = el('button', 'btn quiet slot-choice', candidate.name);
    button.type = 'button';
    button.addEventListener('click', () => swap.onChoose(index, candidate.id));
    box.append(button);
  }
  return { content: box, span: 3 };
};

const amount = (g: number | undefined): Cell => ({
  content: g === undefined ? '' : formatMass(g, 'g'),
  num: true,
});

export const slotsSection = (
  rows: readonly SlotRow[],
  open: readonly OpenRow[],
  swap?: SwapControls,
): HTMLElement => {
  const section = el('section', 'slots');
  section.append(el('h2', undefined, strings.dishes.slotsHeading));
  const cells: Cell[][] = [];
  const classes: (string | undefined)[] = [];
  rows.forEach((row, index) => {
    cells.push([filling(row, index, swap), amount(row.perPortionG), amount(row.totalG)]);
    classes.push(undefined);
    if (swap !== undefined && swap.open === index && swap.alternatives(index).length > 0) {
      cells.push([choices(row, index, swap)]);
      classes.push('slot-swap-row');
    }
  });
  for (const slot of open) {
    const invite = el('span', 'slot-invite', slot.text);
    if (slot.offer !== undefined) invite.append(el('span', 'slot-offer', slot.offer));
    cells.push([{ content: invite, span: 3 }]);
    classes.push('slot-open');
  }
  const table = dataTable(
    'slots-table',
    [
      { text: strings.dishes.colFilling },
      { text: strings.dishes.colPerPortion, num: true },
      { text: strings.dishes.colTotal, num: true },
    ],
    cells,
    classes,
  );
  section.append(table);
  return section;
};
