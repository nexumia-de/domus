// The raw ingredient list "all the way down", for a component and for a dish: one table,
// the lines without an amount listed apart, and the reasons for what could not be added up.
import type { RawRow, UnmeasuredRow } from '../components/raw';
import { formatMass } from '../shared/mass';
import { el } from '../shell/el';
import { strings } from '../strings';
import { dataTable } from './table';

const STATE = {
  raw: strings.notebook.stateRaw,
  cooked: strings.notebook.stateCooked,
  prepared: strings.notebook.statePrepared,
};

export interface RawBlock {
  rows: readonly RawRow[];
  rawG: number;
  unmeasured: readonly UnmeasuredRow[];
  skipped?: readonly { name: string; why: string }[];
}

const list = (heading: string, items: readonly string[]): HTMLElement => {
  const section = el('div', 'raw-extra');
  section.append(el('h3', undefined, heading));
  const ul = el('ul', 'plain-list');
  for (const item of items) ul.append(el('li', undefined, item));
  section.append(ul);
  return section;
};

/** The block for a result of the view logic; `what` says what it is for ("For 4 portions."). */
export const rawBlock = (block: RawBlock, what: string): HTMLElement => {
  const wrap = el('div', 'raw');
  wrap.append(el('p', 'muted', what));
  const rows = block.rows.map((r) => [
    {
      content: r.state === undefined ? r.name : `${r.name}, ${STATE[r.state]}`,
      header: true,
    },
    { content: formatMass(r.g, 'g'), num: true },
  ]);
  if (rows.length > 0) {
    rows.push([
      { content: strings.notebook.rawTotal, header: true },
      { content: formatMass(block.rawG, 'g'), num: true },
    ]);
    wrap.append(
      dataTable(
        'raw-table',
        [
          { text: strings.notebook.colIngredient },
          { text: strings.components.colAmount, num: true },
        ],
        rows,
      ),
    );
  }
  if (block.unmeasured.length > 0) {
    wrap.append(
      list(
        strings.notebook.withoutAmountHeading,
        block.unmeasured.map((u) => strings.notebook.withoutAmount(u.name, u.where)),
      ),
    );
  }
  if (block.skipped !== undefined && block.skipped.length > 0) {
    wrap.append(
      list(
        strings.notebook.notAddedHeading,
        block.skipped.map((s) => s.why),
      ),
    );
  }
  return wrap;
};
