// Persistent storage: ask the browser once, after the first user write
// (never at first load), keep the answer in `meta`, report it in Settings.
// Browsers without the API report "unsupported" and nothing else changes.

import type { KeyValueRepo } from './repo-settings';

export type PersistState = 'unsupported' | 'not-requested' | 'granted' | 'denied';

interface PersistRecord {
  asked: boolean;
}

export interface Persistence {
  /** Current answer; asks nothing. */
  status(): Promise<PersistState>;
  /** Asks the browser the first time only; later calls just report. */
  requestOnce(): Promise<PersistState>;
}

type StorageLike = Pick<StorageManager, 'persist' | 'persisted'> | undefined;

export function createPersistence(
  storage: StorageLike,
  meta: KeyValueRepo<PersistRecord>,
): Persistence {
  const supported = (s: StorageLike): s is NonNullable<StorageLike> =>
    typeof s?.persist === 'function' && typeof s.persisted === 'function';

  async function status(): Promise<PersistState> {
    if (!supported(storage)) return 'unsupported';
    try {
      if (await storage.persisted()) return 'granted';
      return (await meta.get('persist'))?.asked ? 'denied' : 'not-requested';
    } catch {
      return 'not-requested';
    }
  }

  return {
    status,
    async requestOnce() {
      if (!supported(storage)) return 'unsupported';
      try {
        const current = await status();
        if (current !== 'not-requested') return current;
        const granted = await storage.persist();
        await meta.set('persist', { asked: true });
        return granted ? 'granted' : 'denied';
      } catch {
        // Not asked or not recorded: the next first write tries again.
        return 'not-requested';
      }
    },
  };
}
