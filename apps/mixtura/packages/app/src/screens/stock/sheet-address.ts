// The sheets over the Stock screen are the address parameter `sheet`
// (`ingredient`, `batches` with `ing`, `spaces`): one history entry on a phone, so Back
// closes them; a replace on a wide screen.

import { back, go, replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext } from '../../screen';

export type StockSheet = 'ingredient' | 'batches' | 'spaces';

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;

/** The Stock address with the sheet (or none) and the search and show choice kept, `q` unless asked. */
export function stockAddress(
  context: ScreenContext,
  sheet: StockSheet | null,
  options: { ing?: string; keepQ?: boolean } = {},
): string {
  const query = new URLSearchParams(context.route.query);
  query.delete('sheet');
  query.delete('ing');
  if (options.keepQ === false) query.delete('q');
  if (sheet) query.set('sheet', sheet);
  if (sheet === 'batches' && options.ing) query.set('ing', options.ing);
  return formatHash(['stock'], query);
}

export const sheetIs = (context: ScreenContext, sheet: StockSheet): boolean =>
  context.route.query.get('sheet') === sheet;

export function openSheet(context: ScreenContext, address: string): void {
  if (wide()) replace(context.store, address);
  else go(context.store, address);
}

export function closeSheet(context: ScreenContext): void {
  const address = stockAddress(context, null);
  if (wide()) replace(context.store, address);
  else back(context.store, address);
}
