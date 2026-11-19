// The lines of one component as rows: grams, percent of the base, the sub-component marker,
// lines without an amount, and the "buy about" note where an ingredient yield is recorded.
import { bakersPercent, componentLineGrams, toPurchased, yieldFor } from '@culina/engine';
import type { FoodState } from '@culina/engine';
import type { ComponentRecord, Notebook } from '../records';
import { explain, refName } from './names';

export interface LineRow {
  index: number;
  kind: 'ingredient' | 'component';
  id: string;
  name: string;
  state?: FoodState;
  /** Absent for a line without an amount: shown as "to taste". */
  g?: number;
  /** Percent of the component's base role; only where the component has one. */
  percent?: number;
  /** Grams as purchased, only where the ingredient has a recorded yield for the line's state. */
  purchasedG?: number;
  note?: string;
}

export type LinesView =
  { ok: true; rows: LineRow[]; baseRole?: string } | { ok: false; message: string };

/** Purchased grams for an ingredient line in a state with a recorded yield; never assumes 100 %. */
const purchased = (nb: Notebook, id: string, state: FoodState | undefined, g: number) => {
  if (state === undefined) return undefined;
  const yields = nb.ingredientYields(id);
  const found = yieldFor(yields, state);
  if (!found.ok || !found.known) return undefined;
  const result = toPurchased(g, yields, state);
  return result.ok ? result.g : undefined;
};

/** Rows in line order. A failure of the engine gives one plain sentence instead of rows. */
export const lineRows = (nb: Notebook, component: ComponentRecord): LinesView => {
  const grams = componentLineGrams(component, nb.facts);
  if (!grams.ok) return { ok: false, message: explain(grams.error, nb, component.percentBase) };
  const base = component.percentBase;
  const percents =
    base === undefined
      ? undefined
      : bakersPercent(
          grams.lines.map((l) => ({
            id: String(l.index),
            g: l.g,
            ...(l.role === undefined ? {} : { role: l.role }),
          })),
          { baseRole: base },
        );
  const byIndex = new Map(grams.lines.map((l) => [l.index, l]));
  const rows = component.lines.map((line, index): LineRow => {
    const measured = byIndex.get(index);
    const row: LineRow = {
      index,
      kind: line.ref.kind,
      id: line.ref.id,
      name: refName(nb, line.ref),
    };
    if (line.state !== undefined) row.state = line.state;
    if (line.note !== undefined) row.note = line.note;
    if (measured === undefined) return row;
    row.g = measured.g;
    if (percents?.ok) row.percent = percents.pct[String(index)] ?? 0;
    if (line.ref.kind === 'ingredient') {
      const buy = purchased(nb, line.ref.id, line.state, measured.g);
      if (buy !== undefined) row.purchasedG = buy;
    }
    return row;
  });
  return percents?.ok && base !== undefined
    ? { ok: true, rows, baseRole: base }
    : { ok: true, rows };
};
