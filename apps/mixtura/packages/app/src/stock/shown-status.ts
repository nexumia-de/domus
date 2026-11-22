// The sync status the header's icon shows for the stock: the worst of the ticked spaces (the ones
// that count), none before the stock is read.

import { type SyncStatus } from '@nexumia-de/hospes';
import { worstStatus } from '@nexumia-de/hospes/frame';
import { stockState, type StockContext } from './state';

export function shownStatus(context: StockContext): SyncStatus | undefined {
  const stock = stockState(context);
  if (stock.kind !== 'ready') return undefined;
  const { spaces, ticked } = stock.selection;
  return worstStatus(
    spaces
      .filter((space) => ticked.includes(space.id))
      .map(
        (space) =>
          context.data.sync.status(space.id) ??
          (space.deviceOnly ? { kind: 'device-only' as const } : undefined),
      ),
  );
}
