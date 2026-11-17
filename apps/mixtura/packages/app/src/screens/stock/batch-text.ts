// Words for one batch, from the batch card's strings. Pure.

import { shelfStrings as t } from '../spec/shelf-strings';
import type { Batch } from '../../stock/batches';

/** Where the batch stands, in words. */
export function statusText(batch: Batch): string {
  const left = batch.daysLeft ?? 0;
  switch (batch.status) {
    case 'fresh':
      return t.fresh(left);
    case 'use-soon':
      return t.useSoon(left);
    case 'past':
      return t.past(-left);
    case 'invalid':
      return t.invalid;
    default:
      return t.unknown;
  }
}

/** "Made on 2026-11-17 · use by 2026-11-27". */
export const datesText = (batch: Batch): string => t.madeOn(batch.madeOn, batch.useBy);
