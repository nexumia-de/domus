// The calendar day of an instant in a time zone, without a library: `Intl.DateTimeFormat` gives the
// year, month and day as the zone sees them. Pure apart from the zone data of the runtime.

/**
 * @param instant - An ISO 8601 instant (`2026-11-24T23:30:00.000Z`).
 * @param timeZone - An IANA zone (`Europe/Berlin`); undefined is the runtime's own zone.
 * @returns `YYYY-MM-DD` as that zone's calendar shows it; for an instant that cannot be read, its
 *   first ten characters.
 */
export const localDayOf = (instant: string, timeZone?: string): string => {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return instant.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone === undefined ? {} : { timeZone }),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
};
