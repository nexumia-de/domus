import type { Extra, Food } from './derive.mjs';
import type { Names, Snapshot } from './wikidata.mjs';

export interface SourcedNumber {
  value: number;
  source: string;
}
export interface CatalogueRow {
  id: string;
  name: string;
  parentId?: string;
  names?: Names;
  densityGPerMl?: SourcedNumber;
  unitWeightG?: SourcedNumber;
  yields?: { state: string; percent: number; source: string }[];
  /** Nutrients per 100 g; on food rows with the core nutrients, and on parents whose rows agree. */
  'x-nutrition'?: { per100g: Record<string, number>; source?: string };
  /** Present on food rows. */
  'x-fdc'?: { id: number; description: string; category?: string };
  /** Present on generated parents; `rows` is how many food rows are below. */
  'x-group'?: { rows: number; category?: string };
}
export type RefuseMap = Map<
  string,
  { description: string; refuse: number; refuseDescription: string }
>;
/** The named foods of extras.json by FDC id. */
export const EXTRAS: Map<number, Extra>;
/** Whether the food is a row of the catalogue: selected by the rule or named in extras.json. */
export const isSelected: (food: Food) => boolean;
/** The food rows (with yields when `refuse` is given), without parents. */
export const buildRows: (
  foods: Food[],
  release: string,
  refuse?: RefuseMap,
  wikidata?: Snapshot,
) => CatalogueRow[];
/** The food rows with their parent links, and the generated parents. */
export const buildCatalogue: (
  foods: Food[],
  release: string,
  refuse?: RefuseMap,
  wikidata?: Snapshot,
) => CatalogueRow[];
export const serialise: (envelope: {
  ingredients: CatalogueRow[];
  [key: string]: unknown;
}) => string;
