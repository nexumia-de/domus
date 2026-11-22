// "Add example data": the hand-written example records go into the store like the user's own,
// through the same writes, and can be edited and deleted like any other. The texts stored with them
// are in the language the app speaks (`demo/german.ts`). Records that are
// already there are left alone.
import { currentLang } from '../classics/lang';
import { COMPONENTS } from '../demo/components';
import { DISHES } from '../demo/dishes';
import { componentsIn, dishesIn, ingredientsIn } from '../demo/german';
import { INGREDIENTS } from '../demo/ingredients';
import type { Result } from '../store/types';
import { saveRecord, type WritableKind } from './actions';
import { state } from './state';

export const addExamples = async (): Promise<Result> => {
  // The texts stored with an example record are in the language the app speaks now.
  const lang = currentLang();
  const sets: [WritableKind, { id: string }[], { id: string }[]][] = [
    ['ingredients', ingredientsIn(INGREDIENTS, lang), state.ingredients],
    ['components', componentsIn(COMPONENTS, lang), state.components],
    ['dishes', dishesIn(DISHES, lang), state.dishes],
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
