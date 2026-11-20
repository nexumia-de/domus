// The starting categories as data of the engine (docs/categories.md); the file
// names its source and licence.
import data from '../data/categories.json';

export interface StartingCategory {
  id: string;
  en: string;
  de: string;
}

export const STARTING_CATEGORIES: readonly StartingCategory[] = data.categories;
export const STARTING_CATEGORIES_SOURCE: string = data.source;
