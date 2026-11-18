// "Today" for the screens: the one place the app reads the clock for a calendar
// date or instant. Screens and view models take the date as an argument, so tests and the
// engine never read it themselves (the engine is clock-free).

/** Today's date on this device, `YYYY-MM-DD`, in the device's own time zone. */
export function today(): string {
  const now = new Date();
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** The current instant as ISO 8601 in UTC, for the `updatedAt` of records the user changes. */
export function nowInstant(): string {
  return new Date().toISOString();
}
