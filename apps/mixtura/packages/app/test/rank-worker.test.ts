import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { indexOf, rankStock } from '../src/stock/derived';
import type { RankReply, RankRequest } from '../src/stock/rank-worker';
import { fixtureModel } from './browse-fixture';

// The worker script talks to `self`; here `self` is a stand-in that collects
// its replies, so the message protocol is tested without a browser.
interface Scope {
  onmessage: ((event: { data: RankRequest }) => void) | null;
  postMessage: (message: RankReply) => void;
}
const replies: RankReply[] = [];
const scope: Scope = { onmessage: null, postMessage: (m) => void replies.push(m) };

beforeEach(async () => {
  replies.length = 0;
  vi.stubGlobal('self', scope);
  vi.resetModules();
  await import('../src/stock/rank-worker');
});
afterEach(() => vi.unstubAllGlobals());

const entries = [
  { ingredientId: 'rum', present: true },
  { ingredientId: 'simple', present: true },
];

test('the worker ranks like the main thread, from the same tree and specs', () => {
  const model = fixtureModel();
  const index = indexOf(model);
  scope.onmessage?.({ data: { kind: 'index', model: 1, tree: index.tree, specs: index.specs } });
  scope.onmessage?.({
    data: { kind: 'rank', model: 1, id: 7, entries, mode: 'strict', excludeStatuses: ['retired'] },
  });
  const records = new Map(entries.map((e) => [e.ingredientId, e]));
  expect(replies).toEqual([{ id: 7, result: rankStock(model, records, 'strict') }]);
});

test('a request for a model it was not sent is answered with an error, not a guess', () => {
  scope.onmessage?.({
    data: { kind: 'rank', model: 9, id: 1, entries, mode: 'strict', excludeStatuses: ['retired'] },
  });
  expect(replies).toEqual([{ id: 1, error: 'no index for this model' }]);
});
