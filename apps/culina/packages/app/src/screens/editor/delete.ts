// Delete acts at once: the record is tombstoned, a toast offers Undo, no confirmation dialog.
import { dropDraft, draftKey, removeRecord, saveRecord, type WritableKind } from '../../notebook';
import { hashFor } from '../../router';
import { showToast } from '../../shell/toast';
import { strings } from '../../strings';
import { storeText } from './store-text';

export const removeWithUndo = async (
  kind: Exclude<WritableKind, 'ingredients'>,
  id: string,
  name: string,
): Promise<void> => {
  const done = await removeRecord(kind, id);
  if (!done.ok) {
    showToast(storeText(done.error.code));
    return;
  }
  await dropDraft(draftKey(kind === 'components' ? 'component' : 'dish', id));
  const removed = done.removed;
  window.location.hash = hashFor(kind);
  showToast(strings.editor.deleted(name), {
    label: strings.editor.undo,
    run() {
      void saveRecord(kind, removed as never).then((back) =>
        showToast(back.ok ? strings.editor.restored(name) : storeText(back.error.code)),
      );
    },
  });
};
