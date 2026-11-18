// The screens' one access point to the notebook: reads from the in-memory cache, writes through
// the local store. Replaces the example data module as the screens' data access.
export * from './read';
export { removeRecord, saveRecord } from './actions';
export type { WritableKind } from './actions';
export { addExamples } from './examples';
export { dropDraft, draftKey, keepDraft, loadDraft } from './drafts';
export { newId } from './ids';
export { reloadNotebook } from './load';
export { startNotebook } from './start';
export {
  getStockItem,
  listStock,
  removeStockItem,
  restoreStock,
  saveStockItem,
  stockName,
  stockOf,
  tick,
  untick,
} from './stock';
export { subscribe, today } from './state';
export * from './versions';
export {
  makeVariation,
  removeFamily,
  removeTasting,
  restoreFamily,
  restoreVersion,
  saveTasting,
} from './versions-actions';
export { canonicalLines, familyView } from './family-view';
