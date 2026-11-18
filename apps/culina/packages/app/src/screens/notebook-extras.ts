// What the list panes add around the entries: the link to the editor for a new entry, the
// action that writes the example data into an empty notebook, and the quiet store problem.
import { addExamples, isEmpty, storeProblem } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

export const notebookExtras = (
  route: 'components' | 'dishes',
): { actions: Node[]; emptyActions: Node[]; note?: string } => {
  const problem = storeProblem();
  if (problem !== undefined) return { actions: [], emptyActions: [], note: storeText(problem) };
  const add = el(
    'a',
    'btn primary new-link',
    route === 'components' ? strings.editor.addComponent : strings.editor.addDish,
  );
  add.href = hashFor(route, undefined, 'new');
  const examples = el('button', 'btn quiet', strings.empty.addExamples);
  examples.type = 'button';
  examples.addEventListener('click', () => void addExamples());
  const hint = el('p', 'note-quiet', strings.empty.examplesHint);
  return { actions: [add], emptyActions: isEmpty() ? [examples, hint] : [] };
};
