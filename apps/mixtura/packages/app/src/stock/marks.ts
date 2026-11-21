// The records that say "in stock" or "out", as plain functions of the combined
// records, for every shell of the app (the web screens, core.ts for the native
// app). Pure; the records in memory and their writes are state.ts.

import type { StockFields } from '../store';

/** The combined stock of the ticked spaces: one live record per ingredient. */
export type StockRecords = ReadonlyMap<string, StockFields>;

/** The record that marks an ingredient in stock or out, keeping its other fields. */
export function withPresent(records: StockRecords, id: string, present: boolean): StockFields {
  return { ...records.get(id), ingredientId: id, present };
}

/** The ids of the records that say "in stock". */
export function presentIds(records: StockRecords): string[] {
  return [...records.values()].filter((r) => r.present).map((r) => r.ingredientId);
}
