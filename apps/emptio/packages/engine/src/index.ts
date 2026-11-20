// The public entry of the engine. The app and the test vectors use
// nothing else.
export { DEFAULT_PRIORITY, PRIORITIES, isPriority } from './priority';
export type { Priority } from './priority';
export { OTHER_CATEGORY } from './types';
export type { Entry, EntryFields, Origin } from './types';
export { compareText, sortKey } from './sort-key';
export { categoryPosition, homeOrder } from './home-order';
export type { OrderEntry } from './home-order';
export { categoryOrder, newEntryCategory, sameThing } from './category';
export type { CatalogueMatch, CategoryChange, EarlierEntry } from './category';
export { addEntry } from './add-entry';
export { suggest } from './suggest';
export type { SuggestEntry, Suggestion } from './suggest';
export { STARTING_CATEGORIES, STARTING_CATEGORIES_SOURCE } from './starting-categories';
export type { StartingCategory } from './starting-categories';
export { USUAL_ITEMS, USUAL_ITEMS_SOURCE, usualCategory } from './usual-items';
