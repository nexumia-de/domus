// The buttons at the end of an editor: Save, Discard changes, and Delete for a stored record.
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { button } from './form-bits';

export interface EditorActions {
  isNew: boolean;
  onSave(): void;
  onDiscard(): void;
  onDelete(): void;
  /** Where the quiet sentence about what cannot be saved goes. */
  status: HTMLElement;
}

export const editorActions = (config: EditorActions): HTMLElement => {
  const box = el('div', 'editor-end');
  const row = el('div', 'actions');
  row.append(
    button(strings.editor.save, 'primary', config.onSave),
    button(strings.editor.discard, 'quiet', config.onDiscard),
  );
  if (!config.isNew) row.append(button(strings.editor.delete, 'quiet', config.onDelete));
  box.append(config.status, el('p', 'muted', strings.editor.draftKept), row);
  return box;
};
