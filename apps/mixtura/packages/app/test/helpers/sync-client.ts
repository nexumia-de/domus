// A device for the sync tests: local state in memory, synced against a fake storage.
import type { Cipher, Envelope, Place } from '@mixtura/engine';
import { syncPlace, type SyncOutcome } from '../../src/sync';
import type { Ingredient, StockRecord } from '../../src/store';
import { createCipher } from '@nexumia-de/hospes';
import type { FakeStorage } from './fake-adapter';

export const FAST_CIPHER: Cipher = createCipher({ iterations: 1000, minIterations: 1000 });
export const PASS = '7K3M-9QXA-B2CD-EF4G-H5JK';
export const PATH = 'mixtura/home.sync';
export const PLACE_ID = 'u-7c0d1e2f-3a4b-4c5d-8e6f-0a1b2c3d4e5f';
export const PLACE_NAME = 'Secret flat';

export const instant = (n: number): string => `2026-11-18T09:${String(n).padStart(2, '0')}:00Z`;

export const live = (ingredientId: string, at: number, present = true): StockRecord => ({
  placeId: PLACE_ID,
  ingredientId,
  updatedAt: instant(at),
  present,
});
export const gone = (ingredientId: string, at: number): StockRecord => ({
  placeId: PLACE_ID,
  ingredientId,
  updatedAt: instant(at),
  deleted: true,
});

export interface Client {
  place: Place;
  rows: StockRecord[];
  ingredients: Ingredient[];
  passphrase: string;
  envelope?: Envelope | undefined;
  etag?: string | undefined;
  /** Sets or replaces records, as a change on the device would. */
  change(...rows: StockRecord[]): void;
  /** Syncs once; an `ok` outcome is stored like `applyOutcome` would. */
  sync(options?: { maxAttempts?: number }): Promise<SyncOutcome>;
}

export function createClient(
  storage: FakeStorage,
  init: {
    rows?: StockRecord[];
    ingredients?: Ingredient[];
    passphrase?: string;
    placeId?: string;
  } = {},
): Client {
  const adapter = storage.adapter();
  const client: Client = {
    place: { id: init.placeId ?? PLACE_ID, name: PLACE_NAME, updatedAt: instant(0) },
    rows: init.rows ?? [],
    ingredients: init.ingredients ?? [],
    passphrase: init.passphrase ?? PASS,
    change(...rows) {
      for (const row of rows) {
        client.rows = client.rows.filter((r) => r.ingredientId !== row.ingredientId).concat(row);
      }
    },
    async sync(options = {}) {
      const outcome = await syncPlace({
        place: client.place,
        rows: client.rows,
        ingredients: client.ingredients,
        adapter,
        cipher: FAST_CIPHER,
        path: PATH,
        passphrase: client.passphrase,
        previous: client.envelope,
        ...options,
      });
      if (outcome.kind !== 'failed') {
        client.place = outcome.place;
        client.rows = outcome.rows;
        const known = new Set(client.ingredients.map((i) => i.id));
        client.ingredients = client.ingredients.concat(
          outcome.entities.filter((i) => !known.has(i.id)),
        );
        client.envelope = outcome.envelope;
        client.etag = outcome.etag;
      }
      return outcome;
    },
  };
  return client;
}

/** Rows by ingredient id, for comparing two devices. */
export const byId = (rows: readonly StockRecord[]): Record<string, StockRecord> =>
  Object.fromEntries(
    [...rows]
      .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId))
      .map((r) => [r.ingredientId, r]),
  );
