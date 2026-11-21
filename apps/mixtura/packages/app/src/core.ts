// What the app is without a screen, for a second shell: the native Linux app
// (packages/linux) shows the same drinks, stock and balance with the same engine,
// seed and sync. Nothing here touches the DOM.
export { parseSeed } from './store/seed';
export type { Seed, Vocabulary as SeedVocabulary } from './store/seed';
export { buildModel } from './screens/browse/model';
export type { BrowseModel, Drink, ModelInput } from './screens/browse/model';
export type { SpecData, SpecLine } from './screens/browse/types';
export { normalise } from './screens/browse/normalise';
export { deriveStock, hasStock } from './stock/derived';
export type { Availability, Derived } from './stock/derived';
export { combineSpaces } from './stock/combine';
export type { RecordsBySpace } from './stock/combine';
export { presentIds, withPresent } from './stock/marks';
export type { StockRecords } from './stock/marks';
export { STOCK_COLLECTION, loadStock, rowsOf, spaceOf, writeStock } from './stock/source';
export type { StockData } from './stock/source';
export { OTHER_ID, buildStockTree, countPresent, viewRows } from './screens/stock/tree-model';
export type { Row, StockNode, View, ViewOptions } from './screens/stock/tree-model';
export { amountText, fixed } from './screens/spec/format';
export type { Space, Stock, StockFields, StockRecord } from './store';
export { drinkCounts } from './stock/derived';
