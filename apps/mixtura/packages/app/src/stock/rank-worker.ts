// The unlock ranking off the main thread (issue #84). The worker holds the
// stock index of the latest model it was sent and answers one ranking per
// request. It runs the engine's pure functions and nothing else; the
// answer is derived data and never stored.

import {
  buildStockIndex,
  unlockRanking,
  type SpecStatus,
  type StockIndex,
  type StockMode,
  type UnlockResult,
} from '@mixtura/engine';

type Tree = Parameters<typeof buildStockIndex>[0];
type Specs = Parameters<typeof buildStockIndex>[1];
type Entries = Parameters<typeof unlockRanking>[1];

export type RankRequest =
  | { kind: 'index'; model: number; tree: Tree; specs: Specs }
  | {
      kind: 'rank';
      model: number;
      id: number;
      entries: Entries;
      mode: StockMode;
      excludeStatuses: readonly SpecStatus[];
    };

export type RankReply = { id: number; result: UnlockResult } | { id: number; error: string };

interface WorkerScope {
  onmessage: ((event: { data: RankRequest }) => void) | null;
  postMessage(message: RankReply): void;
}

const scope = self as unknown as WorkerScope;
let current: { model: number; index: StockIndex } | undefined;

scope.onmessage = ({ data }) => {
  if (data.kind === 'index') {
    current = { model: data.model, index: buildStockIndex(data.tree, data.specs) };
    return;
  }
  if (!current || current.model !== data.model) {
    scope.postMessage({ id: data.id, error: 'no index for this model' });
    return;
  }
  try {
    scope.postMessage({
      id: data.id,
      result: unlockRanking(current.index, data.entries, {
        mode: data.mode,
        excludeStatuses: data.excludeStatuses,
      }),
    });
  } catch (error) {
    scope.postMessage({ id: data.id, error: (error as Error).message });
  }
};
