import type { Food } from './derive.mjs';

export interface CatalogueRow {
  id: string;
  name: string;
  densityGPerMl?: { value: number; source: string };
  unitWeightG?: { value: number; source: string };
  'x-fdc': { id: number; description: string };
}
export const buildRows: (foods: Food[], release: string) => CatalogueRow[];
export const serialise: (envelope: {
  ingredients: CatalogueRow[];
  [key: string]: unknown;
}) => string;
