// Edit and Delete at the head of a component or dish: Delete acts at once and offers Undo.
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { removeWithUndo } from './editor/delete';

export const detailActions = (
  route: 'components' | 'dishes',
  id: string,
  name: string,
): HTMLElement => {
  const row = el('div', 'actions detail-actions');
  const edit = el('a', 'btn quiet', strings.editor.edit);
  edit.href = hashFor(route, id, 'edit');
  const remove = el('button', 'btn quiet', strings.editor.delete);
  remove.type = 'button';
  remove.addEventListener('click', () => void removeWithUndo(route, id, name));
  row.append(edit, remove);
  return row;
};
