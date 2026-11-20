// A use-by suggestion from an ingredient's recorded shelf life. Offered, never applied: the
// user chooses. No shelf life recorded, or none for the item's state, gives no suggestion.
import { addDays, daysBetween } from '../model';
import { shelfLifeApplies } from './types';
import type { ShelfLifeEntry, StockItem, SuggestionsResult, UseBySuggestion } from './types';

/**
 * The use-by dates the recorded shelf life allows for an item.
 *
 * @param item - The item; `preparedOn`, `state` and `storage` are read. With a `storage` only that place is offered.
 * @param shelfLife - The recorded shelf life of the item's ingredient (every entry has a source).
 * @returns One suggestion per storage place with a value for the item's state (`preparedOn` plus the days), shortest first; empty when there is no date prepared, no state or no value. A date prepared that is not a real date is `invalid-date`.
 */
export function useBySuggestions(
  item: Pick<StockItem, 'preparedOn' | 'state' | 'storage'>,
  shelfLife: readonly ShelfLifeEntry[] = [],
): SuggestionsResult {
  if (item.preparedOn === undefined) return { ok: true, suggestions: [] };
  if (daysBetween(item.preparedOn, item.preparedOn) === undefined) {
    return { ok: false, error: { code: 'invalid-date', field: 'preparedOn' } };
  }
  const suggestions: UseBySuggestion[] = [];
  for (const entry of shelfLife) {
    if (!shelfLifeApplies(entry, item)) continue;
    const useBy = addDays(item.preparedOn, entry.days);
    if (useBy !== undefined) suggestions.push({ storage: entry.storage, days: entry.days, useBy });
  }
  suggestions.sort((a, b) => a.days - b.days || a.storage.localeCompare(b.storage));
  return { ok: true, suggestions };
}
