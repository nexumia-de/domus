// When the backup reminder shows (docs/export-format.md#backup-reminder).
// Pure: the instant comes from the caller.

import type { Backup } from '../types';

/** Days with changes and no export before the reminder shows (docs/screens-stock-settings.md). */
export const REMIND_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const ageDays = (since: string | undefined, now: number): number | null => {
  const t = Date.parse(since ?? '');
  return Number.isNaN(t) ? null : (now - t) / DAY_MS;
};

/**
 * True when there are changes the file does not have, the last export (or,
 * without one, the first change) is at least 30 days back, and the reminder
 * was not dismissed within the last 30 days.
 */
export function reminderDue(backup: Backup, now: number, afterDays = REMIND_AFTER_DAYS): boolean {
  if (backup.changesSinceExport <= 0) return false;
  const age = ageDays(backup.lastExportAt ?? backup.firstChangeAt, now);
  if (age === null || age < afterDays) return false;
  const dismissed = ageDays(backup.dismissedAt, now);
  return dismissed === null || dismissed >= afterDays;
}
