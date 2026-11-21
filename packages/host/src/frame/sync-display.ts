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
