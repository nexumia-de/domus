// The key of a record in the export: its `id`, for every kind.

import type { Kind } from './types';

/** The key of a record of any kind. */
export const keyOf = (_kind: Kind, record: object): string => (record as { id: string }).id;
