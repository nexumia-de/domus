import type { CatalogueRow } from './build.mjs';

export const MIN_ROWS_BELOW: number;
export const MIN_CHILDREN: number;
export const AGREEMENT: number;
export const MIN_VALUES: number;
export const groupIdOf: (name: string) => string;
export const groupRows: (foodRows: CatalogueRow[]) => CatalogueRow[];
