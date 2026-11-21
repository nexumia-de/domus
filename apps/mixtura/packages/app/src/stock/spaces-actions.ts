// Choosing spaces for stock: which count, and which one new entries go to.
// Each change shows at once (memory first, every screen redraws) and the
// device setting is written behind, in order, like a stock mark. A failed
// write reads the store again and says so. Rules: `spaces-rules.ts`. Making,
// naming, sharing and removing a space is the Household app's.
// Docs: docs/screens-stock-settings.md#spaces.

import { toStoreError } from '../store';
import { strings } from '../strings';
import { say } from '../shell/frame';
import * as rules from './spaces-rules';
import {
  enqueueWrite,
  invalidateStock,
  readyCache,
  refresh,
  type Cache,
  type StockContext,
} from './state';

const words = strings.spaces;

/** The words for a refusal. */
export function refusalText(refusal: rules.Refusal): string {
  return refusal.reason === 'last-counting'
    ? words.lastCounting
    : words.entryCounting(refusal.name);
}

/** Puts the selection in memory and writes the setting behind; a failure reads the store again. */
function commit(context: StockContext, cache: Cache, next: rules.Selection): void {
  cache.selection = next;
  refresh(cache, context.store);
  enqueueWrite(async () => {
    try {
      await cache.local.settings.set('spaces', {
        ticked: next.ticked,
        entry: next.entry,
        known: next.spaces.map((s) => s.id),
      });
    } catch (error) {
      say(`${strings.data.notSaved}. ${toStoreError(error).message}`);
      invalidateStock(context.store);
    }
  });
}

/** Ticks or unticks a space. Returns the refusal, if any; the sheet shows it. */
export function tickSpace(context: StockContext, id: string): rules.Refusal | null {
  const cache = readyCache(context);
  if (!cache) return null;
  const result = rules.toggleTicked(cache.selection, id);
  if (!result.ok) return result;
  commit(context, cache, result.selection);
  return null;
}

/** New entries go to this space, which counts from now on. */
export function chooseEntry(context: StockContext, id: string): void {
  const cache = readyCache(context);
  if (!cache || cache.selection.entry === id) return;
  commit(context, cache, rules.setEntry(cache.selection, id));
}
