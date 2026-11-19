// What the backup reminder remembers on this device: the instant of the last export and the
// period the user chose. localStorage may be missing or throw; then nothing is remembered and
// the default period applies.
import { browserStore, type KeyValueStore } from '../prefs';

export const LAST_EXPORT_KEY = 'culina.lastExport';
export const REMINDER_KEY = 'culina.reminderDays';

/** Periods the user can choose, in days; 0 turns the reminder off. */
export const REMINDER_CHOICES = [0, 7, 14, 30, 90] as const;
export const DEFAULT_REMINDER_DAYS = 30;

const read = (store: KeyValueStore | null, key: string): string | null => {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (store: KeyValueStore | null, key: string, value: string): boolean => {
  try {
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const readLastExport = (
  store: KeyValueStore | null = browserStore(),
): string | undefined => {
  const value = read(store, LAST_EXPORT_KEY);
  return value !== null && !Number.isNaN(Date.parse(value)) ? value : undefined;
};

export const writeLastExport = (
  instant: string,
  store: KeyValueStore | null = browserStore(),
): boolean => write(store, LAST_EXPORT_KEY, instant);

export const readReminderDays = (store: KeyValueStore | null = browserStore()): number => {
  const raw = read(store, REMINDER_KEY);
  if (raw === null) return DEFAULT_REMINDER_DAYS;
  return REMINDER_CHOICES.find((choice) => choice === Number(raw)) ?? DEFAULT_REMINDER_DAYS;
};

export const writeReminderDays = (
  days: number,
  store: KeyValueStore | null = browserStore(),
): boolean => write(store, REMINDER_KEY, String(days));
