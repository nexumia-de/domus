// The sync status of a space in words, for the list and the settings.
import type { SyncStatus } from '@nexumia-de/hospes';
import type { Strings } from '../strings';

/** "just now", "5 min ago", "3 h ago", then the date. */
export function ago(t: Strings['status'], at: string, now: string): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(at)) / 60_000);
  if (!(minutes >= 1)) return t.justNow;
  if (minutes < 60) return t.minutes(minutes);
  if (minutes < 24 * 60) return t.hours(Math.floor(minutes / 60));
  return at.slice(0, 10);
}

/** One line for a space; `online` is the browser's word on the connection. */
export function statusText(
  t: Strings['status'],
  status: SyncStatus | undefined,
  now: string,
  online: boolean,
): string {
  if (!status) return '';
  switch (status.kind) {
    case 'device-only':
      return t.deviceOnly;
    case 'syncing':
      return t.syncing;
    case 'failed':
      return online
        ? t.failed((t.failures as Record<string, string>)[status.failure] ?? t.failures.other)
        : t.offline;
    case 'never':
      return online ? t.never : t.offline;
    case 'in-step':
      return t.inStep(ago(t, status.at, now));
  }
}
