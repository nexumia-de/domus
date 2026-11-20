// The sync status of a space's stock in words (stock/sync.ts), for the Spaces sheet.

import { type SyncStatus } from '../../stock/sync';
import { strings } from '../../strings';

const t = strings.spaces.status;

/** "just now", "5 min ago", "3 h ago", then the date. */
export function ago(at: string, now: string): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(at)) / 60_000);
  if (!(minutes >= 1)) return t.justNow;
  if (minutes < 60) return t.minutes(minutes);
  if (minutes < 24 * 60) return t.hours(Math.floor(minutes / 60));
  return at.slice(0, 10);
}

const failureWords = (failure: string): string =>
  (t.failures as Record<string, string>)[failure] ?? t.failures.other;

/** One line for a space; `online` is the browser's word on the connection. */
export function syncText(status: SyncStatus | undefined, now: string, online: boolean): string {
  if (!status) return '';
  switch (status.kind) {
    case 'device-only':
      return t.deviceOnly;
    case 'syncing':
      return t.syncing;
    case 'failed':
      return online ? t.failed(failureWords(status.failure)) : t.offline;
    case 'never':
      return online ? t.never : t.offline;
    case 'in-step':
      return t.inStep(ago(status.at, now));
  }
}
