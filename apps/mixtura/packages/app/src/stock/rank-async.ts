// The unlock ranking computed by a Web Worker (rank-worker.ts), with the
// engine run on the main thread as the fallback where there is no worker
// (or it failed). Derived, never stored: results are kept per browse model,
// records object and mode, like the synchronous `rankStock`. While a new
// ranking is on its way the screen draws the previous one of the same
// model and mode.

import type { SpecStatus, StockMode, UnlockResult } from '@mixtura/engine';
import type { BrowseModel } from '../screens/browse/model';
import { indexOf, rankKey, rankStock } from './derived';
import type { RankReply, RankRequest } from './rank-worker';
import type { StockRecords } from './state';

export interface Ranked {
  /** The ranking for these records, when it has arrived. */
  result: UnlockResult | undefined;
  /** The last ranking that arrived for this model and mode, to draw meanwhile. */
  previous: UnlockResult | undefined;
}

interface PerModel {
  id: number;
  sent: boolean;
  byRecords: WeakMap<StockRecords, Record<string, UnlockResult>>;
  requested: WeakMap<StockRecords, Set<string>>;
  /** The last answer per mode and statuses left out. */
  last: Record<string, UnlockResult>;
}

const models = new WeakMap<BrowseModel, PerModel>();
let nextModel = 1;
let nextRequest = 1;
let worker: Worker | null | undefined;
const waiting = new Map<
  number,
  { entry: PerModel; records: StockRecords; key: string; ready: () => void }
>();

/** The file is next to the page, so it works at `/` and under a sub-path. */
const WORKER_FILE = 'rank-worker.js';

function start(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === 'undefined' ? null : new Worker(WORKER_FILE);
  } catch {
    worker = null;
  }
  worker?.addEventListener('message', ({ data }: MessageEvent<RankReply>) => {
    const job = waiting.get(data.id);
    if (!job) return;
    waiting.delete(data.id);
    if ('result' in data) store(job.entry, job.records, job.key, data.result);
    job.ready();
  });
  worker?.addEventListener('error', () => stop());
  return worker ?? null;
}

/** The worker failed: from now on the main thread ranks. Waiting requests ask again. */
function stop(): void {
  worker?.terminate();
  worker = null;
  const pending = [...waiting.values()];
  waiting.clear();
  for (const job of pending) job.ready();
}

function store(entry: PerModel, records: StockRecords, key: string, result: UnlockResult): void {
  const byKey = entry.byRecords.get(records) ?? {};
  byKey[key] = result;
  entry.byRecords.set(records, byKey);
  entry.last[key] = result;
}

/**
 * The ranking of the stock in a mode. When it is not known yet the worker is
 * asked once and `ready` is called when the answer is in; until then
 * `result` is undefined and `previous` holds the last answer, if any.
 */
export function rankedStock(
  model: BrowseModel,
  records: StockRecords,
  mode: StockMode,
  excludeStatuses: readonly SpecStatus[],
  ready: () => void,
): Ranked {
  const key = rankKey(mode, excludeStatuses);
  let entry = models.get(model);
  if (!entry) {
    entry = {
      id: nextModel++,
      sent: false,
      byRecords: new WeakMap(),
      requested: new WeakMap(),
      last: {},
    };
    models.set(model, entry);
  }
  const known = entry.byRecords.get(records)?.[key];
  if (known) return { result: known, previous: known };
  const w = start();
  if (!w) {
    const result = rankStock(model, records, mode, excludeStatuses);
    store(entry, records, key, result);
    return { result, previous: result };
  }
  const asked = entry.requested.get(records) ?? new Set<string>();
  entry.requested.set(records, asked);
  if (!asked.has(key)) {
    asked.add(key);
    if (!entry.sent) {
      const index = indexOf(model);
      w.postMessage({
        kind: 'index',
        model: entry.id,
        tree: index.tree,
        specs: index.specs,
      } satisfies RankRequest);
      entry.sent = true;
    }
    const id = nextRequest++;
    waiting.set(id, { entry, records, key, ready });
    w.postMessage({
      kind: 'rank',
      model: entry.id,
      id,
      entries: [...records.values()].map((r) => ({
        ingredientId: r.ingredientId,
        present: r.present,
      })),
      mode,
      excludeStatuses,
    } satisfies RankRequest);
  }
  return { result: undefined, previous: entry.last[key] };
}
