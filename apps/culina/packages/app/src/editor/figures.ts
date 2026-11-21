// What each line of the form comes to, live, from the engine: grams and percent of the base.
import { lineRows, type LackingFact } from '../components/lines';
import type { Notebook } from '../records';
import type { ComponentForm } from './component-form';
import { engineLine } from './component-form';

export interface LineFigure {
  g?: number;
  percent?: number;
  /** The line's unit needs a fact its ingredient lacks: it is left out of the sums. */
  lacks?: LackingFact;
}

/** One entry per form line; empty when the engine cannot add the lines up (no base yet, for example). */
export const lineFigures = (nb: Notebook, form: ComponentForm): LineFigure[] => {
  const view = lineRows(nb, {
    id: form.id,
    name: form.name,
    ...(form.percentBase === undefined ? {} : { percentBase: form.percentBase }),
    lines: form.lines.map(engineLine),
    version: { family: form.id, date: '2000-01-01' },
  });
  if (!view.ok) return [];
  return form.lines.map((_, index) => {
    const row = view.rows.find((r) => r.index === index);
    return {
      ...(row?.g === undefined ? {} : { g: row.g }),
      ...(row?.percent === undefined ? {} : { percent: row.percent }),
      ...(row?.unconverted === undefined ? {} : { lacks: row.unconverted.lacks }),
    };
  });
};
