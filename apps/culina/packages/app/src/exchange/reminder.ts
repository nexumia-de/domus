// When the backup banner shows. Pure: the clock, the last export and the span of changes come in.
const DAY_MS = 86_400_000;

/** The oldest and the newest `updatedAt` over every row of the store, tombstones included. */
export interface ChangeSpan {
  first?: string;
  last?: string;
}

export interface ReminderInput {
  now: string;
  /** The instant of the last export on this device, if any. */
  lastExport?: string;
  span: ChangeSpan;
  /** The period the user chose; 0 is off. */
  days: number;
}

/**
 * The banner shows only when there are changes that no export holds and at least `days` days
 * have passed since the last export (or, with no export yet, since the oldest change).
 *
 * @returns Whole days since the last export (`null` when there was none), or undefined: no banner.
 */
export function reminderDue(input: ReminderInput): { sinceExport: number | null } | undefined {
  const { now, lastExport, span, days } = input;
  if (days <= 0 || span.first === undefined || span.last === undefined) return undefined;
  const reference = Date.parse(lastExport ?? span.first);
  if (lastExport !== undefined && !(Date.parse(span.last) > reference)) return undefined;
  const elapsed = Date.parse(now) - reference;
  if (Number.isNaN(elapsed) || elapsed < days * DAY_MS) return undefined;
  return { sinceExport: lastExport === undefined ? null : Math.floor(elapsed / DAY_MS) };
}
