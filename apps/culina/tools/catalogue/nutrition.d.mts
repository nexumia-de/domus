import type { CatalogueRow } from './build.mjs';
import type { Food } from './derive.mjs';

export const NUTRIENTS: { key: string; number: string; unit: string; core: boolean }[];
export const NUTRIENT_AGREEMENT: number;
export const NUTRIENT_ABSOLUTE: Record<string, number>;
export const nutritionOf: (food: Food) => { per100g: Record<string, number> } | undefined;
export const agreedNutrition: (
  members: CatalogueRow[],
) => { per100g: Record<string, number>; source: string } | undefined;
