// Sending one drink: builds the share file of the engine, makes the link and
// keeps the sheet's state (AppState.share). Nothing is stored; the link is
// made again each time the sheet opens (derive, don't store).

import { type AppState } from '../app-state';
import { type Store } from '../state';
import { type LocalStore } from '../store';
import { makeLink } from './link';

export interface ShareSender {
  /** Makes the link of a spec version for the sheet. */
  prepare(specId: string, name: string): Promise<void>;
  /** Copies the link of the open sheet to the clipboard. */
  copy(): Promise<void>;
  /** Hands the link to the system share sheet, where there is one. */
  send(title: string): Promise<void>;
}

/** The app's own address without the hash: origin and base path. */
export const appAddress = (): string => `${location.origin}${location.pathname}`;

/** True when the browser has a system share sheet. */
export const canSystemShare = (): boolean => typeof navigator.share === 'function';

export function createShareSender(
  store: Store<AppState>,
  local: () => LocalStore | null,
  now: () => Date = () => new Date(),
): ShareSender {
  const ready = () => {
    const { share } = store.get();
    return share.kind === 'ready' ? share : null;
  };
  return {
    async prepare(specId, name) {
      store.set({ share: { kind: 'busy' } });
      try {
        const opened = local();
        const built = opened && (await opened.exchange.shareFile(specId, now().toISOString()));
        if (!built || !built.ok) return store.set({ share: { kind: 'failed' } });
        const link = await makeLink(JSON.stringify(built.file), appAddress());
        store.set({
          share: link.ok
            ? { kind: 'ready', url: link.url, name, note: 'none' }
            : { kind: 'too-long' },
        });
      } catch {
        store.set({ share: { kind: 'failed' } });
      }
    },
    async copy() {
      const share = ready();
      if (!share) return;
      let note: 'copied' | 'failed' = 'copied';
      try {
        await navigator.clipboard.writeText(share.url);
      } catch {
        note = 'failed';
      }
      store.set({ share: { ...share, note } });
    },
    async send(title) {
      const share = ready();
      if (!share) return;
      try {
        await navigator.share({ title, url: share.url });
      } catch {
        // Dismissed by the person, or not allowed: the link stays in the sheet to copy.
      }
    },
  };
}
