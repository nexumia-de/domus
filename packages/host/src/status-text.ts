// The sync status of a space in words, for the screens of every app. The words
// (English, German) belong to the app; this file only picks and joins them.
import type { SyncStatus } from './collection-sync';

/** The words an app gives its sync status; `failures` is by the failure codes of a cycle. */
export interface StatusWords {
  deviceOnly: string;
  syncing: string;
  never: string;
  offline: string;
  inStep: (ago: string) => string;
  failed: (why: string) => string;
  justNow: string;
  minutes: (n: number) => string;
  hours: (n: number) => string;
  failures: { other: string } & Record<string, string>;
}

/** "just now", "5 min ago", "3 h ago", then the date. */
export function ago(t: StatusWords, at: string, now: string): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(at)) / 60_000);
  if (!(minutes >= 1)) return t.justNow;
  if (minutes < 60) return t.minutes(minutes);
  if (minutes < 24 * 60) return t.hours(Math.floor(minutes / 60));
  return at.slice(0, 10);
}

/** One line for a space; `online` is the host's word on the connection. */
export function statusText(
  t: StatusWords,
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
      return online ? t.failed(t.failures[status.failure] ?? t.failures.other) : t.offline;
    case 'never':
      return online ? t.never : t.offline;
    case 'in-step':
      return t.inStep(ago(t, status.at, now));
  }
}
