// The small preferences file (`prefs.json`) beside an app's data: the style, the
// shown space and what else an app keeps as text. The same `get` and `set` the
// web apps' preferences have, so an app's shared code takes it as it is.
import type { Files } from '@nexumia-de/hospes';

export interface FilePrefs {
  get(key: string): string | null;
  /** @returns false when the file could not be written. */
  set(key: string, value: string): boolean;
}

export function filePrefs(files: Files, name = 'prefs.json'): FilePrefs {
  const read = (): Record<string, string> => {
    try {
      return JSON.parse(files.read(name) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  };
  return {
    get: (key) => read()[key] ?? null,
    set(key, value) {
      try {
        files.write(name, JSON.stringify({ ...read(), [key]: value }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
