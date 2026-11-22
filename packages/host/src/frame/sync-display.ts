// What the small sync icon of the header shows: one of six states out of the sync status of the
// shown space and the connection. Pure; the words come from `statusText`.
import type { SyncStatus } from '../collection-sync';

export type SyncDisplay = 'local' | 'never' | 'syncing' | 'synced' | 'failed' | 'offline';

export function syncDisplay(status: SyncStatus | undefined, online: boolean): SyncDisplay {
  if (status === undefined || status.kind === 'device-only') return 'local';
  switch (status.kind) {
    case 'syncing':
      return 'syncing';
    case 'in-step':
      return 'synced';
    case 'never':
      return online ? 'never' : 'offline';
    case 'failed':
      return online ? 'failed' : 'offline';
  }
}

const RANK: Record<SyncStatus['kind'], number> = {
  'device-only': 0,
  'in-step': 1,
  never: 2,
  syncing: 3,
  failed: 4,
};

/**
 * One status for an app that shows several spaces at once (Mixtura's stock counts several):
 * the one that needs attention most (a failure, then a cycle running, then never synced, then in
 * step, then on this device only). Undefined when there is none.
 */
export function worstStatus(statuses: readonly (SyncStatus | undefined)[]): SyncStatus | undefined {
  let worst: SyncStatus | undefined;
  for (const status of statuses) {
    if (status !== undefined && (worst === undefined || RANK[status.kind] > RANK[worst.kind])) {
      worst = status;
    }
  }
  return worst;
}
