// The public entry of the engine. The app and the test vectors use nothing else. The entry of the
// list, rules 4 and 5, the sort key, the priorities and the usual items are in the shared list
// package (@nexumia-de/list), which Culina writes the list with too.
export { categoryPosition, homeOrder } from './home-order';
export type { OrderEntry } from './home-order';
export { categoryOrder } from './category';
export type { CategoryChange } from './category';
export { suggest } from './suggest';
export type { SuggestEntry, Suggestion } from './suggest';
export { STARTING_CATEGORIES, STARTING_CATEGORIES_SOURCE } from './starting-categories';
export type { StartingCategory } from './starting-categories';
