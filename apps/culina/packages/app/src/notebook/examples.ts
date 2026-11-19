// "Add example data": the hand-written example records go into the store like the user's own,
// through the same writes, and can be edited and deleted like any other. Records that are
// already there are left alone.
import { COMPONENTS } from '../demo/components';
import { DISHES } from '../demo/dishes';
import { INGREDIENTS } from '../demo/ingredients';
import type { Result } from '../store/types';
import { saveRecord, type WritableKind } from './actions';
import { state } from './state';

export const addExamples = async (): Promise<Result> => {
  const sets: [WritableKind, { id: string }[], { id: string }[]][] = [
    ['ingredients', INGREDIENTS, state.ingredients],
    ['components', COMPONENTS, state.components],
    ['dishes', DISHES, state.dishes],
  ];
  for (const [kind, examples, present] of sets) {
    for (const record of examples) {
      if (present.some((r) => r.id === record.id)) continue;
      const done = await saveRecord(kind, record as never);
      if (!done.ok) return done;
    }
  }
  return { ok: true };
};
