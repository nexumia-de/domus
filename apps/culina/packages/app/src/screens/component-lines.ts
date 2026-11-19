// The lines of a component: amount in grams, percent of the base where there is one, a link and
// a small tag on a sub-component line, "to taste" for a line without an amount, "buy about".
import type { LinesView, LineRow } from '../components/lines';
import { hashFor } from '../router';
import { formatMass, formatNumber } from '../shared/mass';
import { el } from '../shell/el';
import { strings } from '../strings';
import { dataTable, type Cell } from './table';

const STATE = {
  raw: strings.notebook.stateRaw,
  cooked: strings.notebook.stateCooked,
  prepared: strings.notebook.statePrepared,
};

const nameCell = (row: LineRow, linked: boolean): Cell => {
  const box = el('span', 'line-name');
  const tag = el('span', 'tag', strings.components.subTag);
  if (row.kind === 'component' && linked) {
    const a = el('a', 'line-link', row.name);
    a.href = hashFor('components', row.id);
    a.append(' ', tag);
    box.append(a);
  } else {
    box.append(row.name);
    if (row.kind === 'component') box.append(' ', tag);
  }
  const extra = [
    row.state === undefined ? undefined : STATE[row.state],
    row.purchasedG === undefined
      ? undefined
      : strings.components.buyAbout(formatMass(row.purchasedG, 'g')),
    row.note,
  ].filter((part): part is string => part !== undefined);
  if (extra.length > 0) box.append(el('span', 'line-extra', extra.join(' · ')));
  return { content: box, header: true };
};

/** The table, or one quiet line saying why the lines cannot be shown. */
export const linesSection = (view: LinesView, known: (id: string) => boolean): HTMLElement => {
  const section = el('section', 'lines');
  section.append(el('h2', undefined, strings.components.linesHeading));
  if (!view.ok) {
    section.append(el('p', 'note-quiet', view.message));
    return section;
  }
  const columns = [
    { text: strings.notebook.colIngredient },
    { text: strings.components.colAmount, num: true },
    ...(view.baseRole === undefined
      ? []
      : [{ text: strings.components.colPercent(view.baseRole), num: true, className: 'pct' }]),
  ];
  const rows = view.rows.map((row) => [
    nameCell(row, row.kind === 'component' && known(row.id)),
    {
      content: row.g === undefined ? strings.notebook.toTaste : formatMass(row.g, 'g'),
      num: true,
    },
    ...(view.baseRole === undefined
      ? []
      : [{ content: row.percent === undefined ? '' : formatNumber(row.percent, 1), num: true }]),
  ]);
  section.append(dataTable('lines-table', columns, rows));
  return section;
};
