// Restore as New Version: the chosen version's content is copied forward as
// the next version with the note "Restored from vN". The older versions are
// untouched. The write path is the store's `restoreVersion`.

import { replace } from '../../navigation';
import { type ScreenContext } from '../../screen';
import { newUserId, restoreVersion, systemClock } from '../../store';
import { showToast } from '../../toasts';
import { refreshBrowse } from '../browse/load';
import { versionStrings as vs } from './strings';

export async function restore(context: ScreenContext, lineageId: string, n: number): Promise<void> {
  const { store, data } = context;
  const local = data.local();
  if (!local) return;
  try {
    const saved = await restoreVersion(
      local,
      lineageId,
      n,
      { id: newUserId(), at: systemClock() },
      vs.restoredNote(n),
    );
    if (!saved) return;
    await refreshBrowse(store, data.catalog());
    replace(store, `#/drinks/${encodeURIComponent(lineageId)}/versions`);
    showToast(store, vs.restored(saved.name, n, saved.version));
  } catch (error) {
    showToast(store, vs.restoreFailed((error as Error).message));
  }
}
