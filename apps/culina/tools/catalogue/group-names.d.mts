import type { CatalogueRow } from './build.mjs';
import type { Names } from './wikidata.mjs';

export const agreedNames: (members: CatalogueRow[]) => Names | undefined;
export const agreedCategory: (members: CatalogueRow[]) => string | undefined;
