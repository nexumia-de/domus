// What the app is without a screen, for a second shell: the native Linux app (packages/linux)
// shows the same classics, amounts, steps and finder with the same engine, content and sync.
// Nothing here touches the DOM. Texts are the web app's own (`strings`), chosen once by the
// device's language when the modules load (`classics/lang.ts`).
export { classics, loadContent, readContent, substitutes, techniques } from './classics/content';
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
export { currentLang } from './classics/lang';
export { findClassics } from './cook/classic-finder';
export type { FoundClassics } from './cook/classic-finder';
export { classicLookup, classicRow } from './cook/classic-rows';
export type { ClassicRow } from './cook/classic-rows';
export { lookupOf } from './cook/lookup';
export type { CookSource } from './cook/input';
export { cookInput } from './cook/input';
export {
  CLASSIC_COUNTRIES,
  COOK_KEY,
  DEFAULT_COOK_FILTERS,
  MAX_LACKING,
  SPACE_KEY,
  // The native Linux app still filters the classics by country and meat itself; under the names it
  // imports, it gets the finder filters with those two choices (prefs.ts, ClassicFinderFilters).
  parseClassicFinderFilters as parseCookFilters,
} from './prefs';
export type { ClassicCountry, ClassicFinderFilters as CookFilters, KeyValueStore } from './prefs';
export { createStockSpace } from './shared-stock/space';
export type { StockSpace, StockSpaceOptions, StockSpaceState } from './shared-stock/space';
export { itemsFromRecords } from './shared-stock/items';
export type { ResolveKey } from './shared-stock/items';
export { restoreEdit, tickEdit, untickEdit } from './shared-stock/edits';
export type { Decision, StockUndo, SyncRecord } from './shared-stock/edits';
export { STOCK } from './shared-stock/value';
export { displayName, matchesAnyName } from './shared/names';
export { strings, stringsDe, stringsEn } from './strings';
export type { Strings } from './strings';
export type { IngredientRecord, StockRecord } from './records';
