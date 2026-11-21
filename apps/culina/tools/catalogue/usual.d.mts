import type { CatalogueRow } from './build.mjs';

/** usual.json: per parent the FDC id of its usual member and the reason (a judgement). */
export interface UsualTable {
  note?: string;
  groups: { group: string; usual: number; why: string }[];
}

export const applyUsual: (entries: CatalogueRow[], table: UsualTable) => CatalogueRow[];
