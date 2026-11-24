// What the app is without a screen, for a second shell: the native Linux app (packages/linux)
// shows the same classics, amounts, steps and finder with the same engine, content and sync.
// Nothing here touches the DOM. Texts are the web app's own (`strings`), chosen once by the
// device's language when the modules load (`classics/lang.ts`).
export {
  classics,
  dishClassics,
  loadContent,
  readContent,
  substitutes,
  techniques,
} from './classics/content';
export type { Fetcher as ContentFetcher } from './classics/content';
export { loadCatalogue, readCatalogue } from './catalogue/load';
export type { Fetcher as CatalogueFetcher } from './catalogue/load';
export { COUNTRIES, classicRows, countryChoices, isCountry } from './classics/list-view';
export type { ClassicRow as ClassicListRow, CountryChoice } from './classics/list-view';
export { dishView } from './classics/dish-view';
export type { ComponentView, DishView, LineView, NameOf } from './classics/dish-view';
export { cookView } from './classics/cook-view';
export type { StepView } from './classics/cook-view';
export { portionsOf, setPortions, setStep, stepOf } from './classics/session';
export {
  asChosen,
  chooseFilling,
  fillingChoices,
  resetChoices,
  withChoices,
} from './classics/choices';
export type { FillingChoice } from './classics/choices';
export { roleLabel } from './components/names';
export { currentLang } from './classics/lang';
export { findClassics } from './cook/classic-finder';
export type { Shipped } from './cook/finder';
export { useUpWords } from './cook/rows';
export { readyKeysOf } from './dishes/ready-now';
export { useUpFrom, useUpNote } from './dishes/use-up-order';
export type { UseUpNow } from './dishes/use-up-order';
export type { UseUpMark } from './cook/one-list';
export type { FoundClassics } from './cook/classic-finder';
export { classicLookup, classicRow } from './cook/classic-rows';
export type { ClassicRow } from './cook/classic-rows';
export { lookupOf } from './cook/lookup';
export type { CookSource } from './cook/input';
export { cookInput } from './cook/input';
export {
  COOK_KEY,
  COOK_LIST_KEY,
  DEFAULT_COOK_FILTERS,
  MAX_LACKING,
  SPACE_KEY,
  parseCookFilters,
  parseCookList,
} from './prefs';
export type { CookFilters, CookList, CookOrder, KeyValueStore } from './prefs';
export { createStockSpace } from './shared-stock/space';
export type { StockSpace, StockSpaceOptions, StockSpaceState } from './shared-stock/space';
export { itemsFromRecords } from './shared-stock/items';
export type { ResolveKey } from './shared-stock/items';
export { restoreEdit, saveEdit, tickEdit, untickEdit } from './shared-stock/edits';
export type { Decision, StockUndo, SyncRecord } from './shared-stock/edits';
export { STOCK } from './shared-stock/value';
export { displayName, matchesAnyName } from './shared/names';
export { strings, stringsDe, stringsEn } from './strings';
export type { Strings } from './strings';
export type { IngredientRecord, StockRecord } from './records';
export { entryOfClassic } from './browse/entry';
export type { DishEntry } from './browse/entry';
export {
  COURSE_ORDER,
  DISH_FILTER_KEY,
  isEmptyFilter,
  matchesFilter,
  offeredBy,
  parseDishFilter,
} from './browse/filter';
export type { DishFilter, Offered } from './browse/filter';
export { dishListView } from './browse/list-view';
export type { CookNarrowing, DishListView, ListRow } from './browse/list-view';
export { GROUP_COURSES, groupRows } from './browse/groups';
export type { GroupId, RowGroup } from './browse/groups';
export { CHARACTER_TABLE } from './characters/table';
export { characterLabel } from './characters/view';
