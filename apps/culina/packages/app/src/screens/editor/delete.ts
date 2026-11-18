// Delete acts at once: every version record of the component or dish and its tasting notes are
// tombstoned (the user's delete of the whole thing, not an edit of history), a toast offers
// Undo, no confirmation dialog.
import { dropDraft, draftKey, removeFamily, restoreFamily } from '../../notebook';
import { hashFor } from '../../router';
import { showToast } from '../../shell/toast';
import { strings } from '../../strings';
import { storeText } from './store-text';

export const removeWithUndo = async (
  kind: 'components' | 'dishes',
  id: string,
  name: string,
): Promise<void> => {
  const done = await removeFamily(kind, id);
  if (!done.ok) {
    showToast(storeText(done.error.code));
    return;
  }
  const removed = done.removed;
  const drafts = removed.versions.map((v) =>
    dropDraft(draftKey(kind === 'components' ? 'component' : 'dish', v.id)),
  );
  await Promise.all(drafts);
  window.location.hash = hashFor(kind);
  showToast(strings.editor.deleted(name), {
    label: strings.editor.undo,
    run() {
      void restoreFamily(removed).then((back) =>
        showToast(back.ok ? strings.editor.restored(name) : storeText(back.error.code)),
      );
    },
  });
};
