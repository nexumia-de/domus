// Device settings and small bookkeeping records, one `{ key, value }`
// record each. Not entities: no JSON Schema, a hand-written parser that
// falls back to the default for anything unknown, and a write does not
// count as a user write for the persistence request.

import { committed, request } from './db';
import { toStoreError } from './errors';
import type { Settings, Theme, Units } from './types';

export const defaultSettings: Settings = {
  theme: 'system',
  units: 'metric',
  backup: { changesSinceExport: 0 },
};

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
const UNITS: readonly Units[] = ['metric', 'us', 'imperial'];

function parseBackup(value: unknown): Settings['backup'] {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const text = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);
  const lastExportAt = text(v['lastExportAt']);
  const dismissedAt = text(v['dismissedAt']);
  const n = v['changesSinceExport'];
  return {
    changesSinceExport: typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0,
    ...(lastExportAt && { lastExportAt }),
    ...(dismissedAt && { dismissedAt }),
  };
}

export function parseSettings(records: { key: string; value: unknown }[]): Settings {
  const byKey = new Map(records.map((r) => [r.key, r.value]));
  return {
    theme: THEMES.find((t) => t === byKey.get('theme')) ?? defaultSettings.theme,
    units: UNITS.find((u) => u === byKey.get('units')) ?? defaultSettings.units,
    backup: parseBackup(byKey.get('backup')),
  };
}

export interface KeyValueRepo<V> {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V): Promise<void>;
}

export function keyValueRepo<V>(db: IDBDatabase, store: string): KeyValueRepo<V> {
  return {
    async get(key) {
      try {
        const record = (await request(db.transaction(store).objectStore(store).get(key))) as
          { value: V } | undefined;
        return record?.value;
      } catch (error) {
        throw toStoreError(error);
      }
    },
    async set(key, value) {
      try {
        const tx = db.transaction(store, 'readwrite');
        const done = committed(tx);
        done.catch(() => undefined);
        tx.objectStore(store).put({ key, value });
        await done;
      } catch (error) {
        throw toStoreError(error);
      }
    },
  };
}

export interface SettingsRepo {
  load(): Promise<Settings>;
  set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
}

export function settingsRepo(db: IDBDatabase): SettingsRepo {
  const kv = keyValueRepo<unknown>(db, 'settings');
  return {
    async load() {
      try {
        const all = await request(db.transaction('settings').objectStore('settings').getAll());
        return parseSettings(all as { key: string; value: unknown }[]);
      } catch (error) {
        throw toStoreError(error);
      }
    },
    set: (key, value) => kv.set(key, value),
  };
}
