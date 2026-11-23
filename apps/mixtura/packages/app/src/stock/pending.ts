// Notes of stock changes whose write has been asked for and has not finished.
// The shared store reads a collection and writes it in the callback of that
// read, so a page that goes away in between (a reload, a closed tab) loses the
// change. A note is written at the moment of the change, in the same task and
// in storage that needs no callback, and taken away when the write has
// settled; the next page that reads the stock writes what is left.
// Docs: docs/store.md#a-change-the-page-did-not-live-to-write and
// packages/host/docs/sync-orderings.md.

import type { StockRecord } from '../store';

/** The part of the Web Storage API the notes need. */
export interface KeyValue {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingEntry {
  id: string;
  records: StockRecord[];
}

export interface PendingStore {
  /** Notes the records of one change; returns the id to remove it by, or '' when it could not be noted. */
  add(records: readonly StockRecord[]): string;
  remove(id: string): void;
  /**
   * The notes to write now, oldest first: every note of this tab, and a note of another tab once
   * it is older than `OTHER_TAB_WAIT_MS` (that tab's write has settled by then, or the tab is gone).
   */
  due(): PendingEntry[];
}

export const PENDING_PREFIX = 'mixtura.stock.pending.';
export const TAB_KEY = 'mixtura.tab';
/** How old another tab's note must be before this tab writes it. */
export const OTHER_TAB_WAIT_MS = 10_000;

interface Stored {
  tab: string;
  at: number;
  records: StockRecord[];
}

const isRecord = (r: unknown): r is StockRecord =>
  r !== null &&
  typeof r === 'object' &&
  typeof (r as StockRecord).spaceId === 'string' &&
  typeof (r as StockRecord).ingredientId === 'string' &&
  typeof (r as StockRecord).updatedAt === 'string';

const parse = (text: string | null): Stored | undefined => {
  try {
    const v = JSON.parse(text ?? 'null') as Stored | null;
    return v !== null &&
      typeof v === 'object' &&
      typeof v.tab === 'string' &&
      typeof v.at === 'number' &&
      Array.isArray(v.records) &&
      v.records.every(isRecord)
      ? v
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The notes in `shared` (kept across tabs and reloads), with the tab named in `tab` (kept across
 * a reload of this tab only). Storage that refuses (full, switched off) makes `add` return ''
 * and `due` return nothing: the change is then as safe as it was without notes.
 */
export function pendingStore(
  shared: KeyValue,
  tab: KeyValue,
  clock: () => number = Date.now,
): PendingStore {
  let counter = 0;
  const tabId = (): string => {
    const known = tab.getItem(TAB_KEY);
    if (known) return known;
    const made = `${clock().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    tab.setItem(TAB_KEY, made);
    return made;
  };
  return {
    add(records) {
      try {
        const me = tabId();
        counter += 1;
        // Sorts by time, then by the order within this page.
        const id = `${String(clock()).padStart(15, '0')}.${String(counter).padStart(6, '0')}.${me}`;
        const stored: Stored = { tab: me, at: clock(), records: [...records] };
        shared.setItem(PENDING_PREFIX + id, JSON.stringify(stored));
        return id;
      } catch {
        return '';
      }
    },
    remove(id) {
      if (id === '') return;
      try {
        shared.removeItem(PENDING_PREFIX + id);
      } catch {
        /* nothing to take away */
      }
    },
    due() {
      try {
        const me = tabId();
        const keys: string[] = [];
        for (let i = 0; i < shared.length; i += 1) {
          const k = shared.key(i);
          if (k?.startsWith(PENDING_PREFIX)) keys.push(k);
        }
        const out: PendingEntry[] = [];
        for (const k of keys.sort()) {
          const stored = parse(shared.getItem(k));
          // A note nobody can read is of no use and would be looked at on every read.
          if (!stored) shared.removeItem(k);
          else if (stored.tab === me || clock() - stored.at >= OTHER_TAB_WAIT_MS)
            out.push({ id: k.slice(PENDING_PREFIX.length), records: stored.records });
        }
        return out;
      } catch {
        return [];
      }
    },
  };
}

let browser: PendingStore | null | undefined;

/** The notes in the browser's storage; null where there is none (tests in Node, storage switched off). */
export function browserPending(): PendingStore | null {
  if (browser !== undefined) return browser;
  try {
    browser =
      typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined'
        ? null
        : pendingStore(localStorage, sessionStorage);
  } catch {
    browser = null;
  }
  return browser;
}
