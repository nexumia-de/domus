// The key of a record in the export: `id` for most kinds, the pair of place and
// ingredient for stock (docs/data-model.md#stock). Joined with a space, which
// no id contains.

import type { Kind } from './types';

/** The key of a stock record: place and ingredient. */
export const stockKey = (record: { placeId: string; ingredientId: string }): string =>
  `${record.placeId} ${record.ingredientId}`;

/** The key of a record of any kind. */
export const keyOf = (kind: Kind, record: object): string =>
  kind === 'stock'
    ? stockKey(record as { placeId: string; ingredientId: string })
    : (record as { id: string }).id;
