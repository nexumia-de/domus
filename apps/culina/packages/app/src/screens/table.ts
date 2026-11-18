// A small table builder: a header row and body rows, numbers right-aligned in the `num` class.
import { el } from '../shell/el';

export interface Column {
  text: string;
  num?: boolean;
  className?: string;
}

export interface Cell {
  content: string | Node;
  num?: boolean;
  /** The first cell of a row is its row header. */
  header?: boolean;
  span?: number;
}

export const dataTable = (
  className: string,
  columns: readonly Column[],
  rows: readonly (readonly Cell[])[],
  rowClasses: readonly (string | undefined)[] = [],
): HTMLTableElement => {
  const table = el('table', className);
  const head = el('tr');
  for (const column of columns) {
    const th = el(
      'th',
      [column.num ? 'num' : '', column.className ?? ''].join(' ').trim() || undefined,
      column.text,
    );
    th.scope = 'col';
    head.append(th);
  }
  const thead = el('thead');
  thead.append(head);
  const body = el('tbody');
  for (const [i, row] of rows.entries()) {
    const tr = el('tr', rowClasses[i]);
    for (const cell of row) {
      const node = el(cell.header ? 'th' : 'td', cell.num ? 'num' : undefined);
      if (cell.header) node.scope = 'row';
      if (cell.span !== undefined) node.colSpan = cell.span;
      node.append(cell.content);
      tr.append(node);
    }
    body.append(tr);
  }
  table.append(thead, body);
  return table;
};
