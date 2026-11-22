// The end of an editor: the note about the draft, and a bar with Save, Discard changes and, for a stored
// record, Delete. The bar sticks above the bottom navigation, so Save is always on the screen however long
// the form is; it is a direct child of the editor, so it can stick along the whole form.
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { button } from './form-bits';

export interface EditorActions {
  isNew: boolean;
  onSave(): void;
  onDiscard(): void;
  onDelete(): void;
  /** Where the short sentence about what cannot be saved goes (it is in the bar, so it is seen). */
  status: HTMLElement;
}

export const editorActions = (config: EditorActions): DocumentFragment => {
  const bar = el('div', 'editor-bar');
  const row = el('div', 'actions');
  row.append(
    button(strings.editor.save, 'primary', config.onSave),
    button(strings.editor.discard, 'quiet', config.onDiscard),
  );
  if (!config.isNew) row.append(button(strings.editor.delete, 'quiet', config.onDelete));
  bar.append(row, config.status);
  const end = document.createDocumentFragment();
  end.append(el('p', 'muted editor-end', strings.editor.draftKept), bar);
  return end;
};
