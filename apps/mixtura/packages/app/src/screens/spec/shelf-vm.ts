// The batch card of a prepared ingredient as data (#37): the user's shelf life
// and storage, the made-on date of the current batch from the stock record and,
// from the engine, the use-by date and where the batch stands. Nothing is
// stored beyond what the user entered: the stock record's `openedOn` is the day
// the current batch was made, `present` says whether it is at hand
// (docs/data-model.md#stock). `today` comes from the host.

import { expiry, limitingShelfLife, type ExpiryStatus } from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';
import type { Ingredient, SpecData } from '../browse/types';
import { batchDates } from '../../stock/batches';
import type { StockRecords } from '../../stock/state';
import { shelfStrings as t } from './shelf-strings';

export type BatchStatus = ExpiryStatus | 'invalid';

export interface ShelfVM {
  ingredientId: string;
  name: string;
  /** Days and, when another prepared ingredient inside it sets them, its name. */
  shelfLine: string;
  storage?: string;
  /** Absent while no batch is recorded. */
  batch?: {
    madeOn: string;
    /** "Made on ... use by ...". */
    dates: string;
    status: BatchStatus;
    /** Words for the state; the card adds a shape. */
    text: string;
    /** Further batches at hand; this card shows the newest. */
    others: number;
  };
}

/** The prepared ingredient whose recipe is this spec, if any. */
export function preparedOf(model: BrowseModel, spec: SpecData): Ingredient | undefined {
  for (const id of model.tree.ids) {
    const item = model.tree.byId.get(id) as Ingredient;
    if (item.prepared?.specId === spec.id) return item;
  }
  return undefined;
}

export function shelfVM(
  model: BrowseModel,
  spec: SpecData,
  records: StockRecords,
  today: string,
): ShelfVM | undefined {
  const ing = preparedOf(model, spec);
  if (!ing) return undefined;
  const limit = limitingShelfLife(model.tree, model.preparedSpecs, ing.id);
  const vm: ShelfVM = {
    ingredientId: ing.id,
    name: ing.name,
    shelfLine: !limit.known
      ? t.noShelfLife
      : limit.limitingId === ing.id
        ? t.shelfLife(limit.days)
        : `${t.shelfLife(limit.days)}, ${t.limitedBy(model.ingredientName(limit.limitingId) ?? limit.limitingId)}`,
    ...(ing.storage && { storage: ing.storage }),
  };
  const record = records.get(ing.id);
  if (record?.present && record.openedOn) {
    const e = expiry({
      madeOn: record.openedOn,
      today,
      ...(limit.known && { shelfLifeDays: limit.days, limitingId: limit.limitingId }),
    });
    const status: BatchStatus = e.reason === 'invalid-date' ? 'invalid' : e.status;
    const left = e.daysLeft ?? 0;
    vm.batch = {
      madeOn: record.openedOn,
      others: batchDates(record).length - 1,
      dates: t.madeOn(record.openedOn, e.useBy),
      status,
      text:
        status === 'invalid'
          ? t.invalid
          : status === 'fresh'
            ? t.fresh(left)
            : status === 'use-soon'
              ? t.useSoon(left)
              : status === 'past'
                ? t.past(-left)
                : t.unknown,
    };
  }
  return vm;
}
