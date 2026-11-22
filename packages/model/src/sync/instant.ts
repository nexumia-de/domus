// Order of two instants without a Date object: the form
// `YYYY-MM-DDThh:mm:ss[.fff]Z` (UTC) is fixed, so the day number of the date
// plus the time of day in milliseconds is enough.

import { dateOfDay, dayNumber } from '../shelf/dates';

const PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/;
const DAY_MS = 86_400_000;

/**
 * Converts a UTC timestamp to milliseconds since an arbitrary origin, enough to order two instants.
 * @param text The candidate, `YYYY-MM-DDThh:mm:ss[.fff]Z`.
 * @returns The milliseconds, or undefined when the value is not such a timestamp.
 */
export function instantMs(text: unknown): number | undefined {
  const m = typeof text === 'string' ? PATTERN.exec(text) : null;
  if (!m) return undefined;
  const day = dayNumber(m[1] as string);
  const [h, min, s] = [Number(m[2]), Number(m[3]), Number(m[4])];
  if (day === undefined || h > 23 || min > 59 || s > 59) return undefined;
  const ms = Number(((m[5] ?? '') + '000').slice(0, 3));
  return day * DAY_MS + ((h * 60 + min) * 60 + s) * 1000 + ms;
}

const two = (n: number): string => String(n).padStart(2, '0');

/**
 * Writes milliseconds as a UTC timestamp, the inverse of `instantMs`, without a Date object.
 * @param ms Milliseconds on the scale `instantMs` uses.
 * @returns `YYYY-MM-DDThh:mm:ss.fffZ` with exactly three fraction digits, or undefined when `ms` is not a whole number or the date is outside the years 0000 to 9999.
 */
export function instantText(ms: number): string | undefined {
  if (!Number.isInteger(ms)) return undefined;
  const day = Math.floor(ms / DAY_MS);
  const date = dateOfDay(day);
  if (date === undefined) return undefined;
  const rest = ms - day * DAY_MS;
  const s = Math.floor(rest / 1000);
  const frac = String(rest % 1000).padStart(3, '0');
  return `${date}T${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}.${frac}Z`;
}
