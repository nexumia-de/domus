// After an unmark in the combined view: which of the ingredients are still in
// stock because another ticked space has them, said in words so the unchanged
// check mark is not a silent failure.

import { type StockState } from '../../stock/state';
import { strings } from '../../strings';

export interface Stays {
  length: number;
  text: string;
}

export function stillPresent(state: StockState, ids: readonly string[]): Stays {
  if (state.kind !== 'ready') return { length: 0, text: '' };
  const left = ids.filter((id) => state.records.get(id)?.present === true);
  const names = left.length === 1 ? (state.presentAt.get(left[0] ?? '') ?? []) : [];
  const text =
    left.length === 1 && names.length > 0
      ? strings.spaces.stillAt(names.join(' · '))
      : strings.spaces.stillMany(left.length);
  return { length: left.length, text };
}
