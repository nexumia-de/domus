// The screens' one access point to the notebook: reads from the in-memory cache, writes through
// the local store. Replaces the example data module as the screens' data access.
export * from './read';
export { removeRecord, saveRecord } from './actions';
export type { WritableKind } from './actions';
export { learnedSkills, setLearned } from './skills';
export { clearCooked, cookedByFamily, cookedOn, markCooked, onCookedChange } from './cooked';
export { addExamples } from './examples';
export { dropDraft, draftKey, keepDraft, loadDraft } from './drafts';
export { newId } from './ids';
export { reloadNotebook } from './load';
export { startNotebook } from './start';
export {
  addStockItem,
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
export type { StockUndo } from './stock';
export { localToday, subscribe, today } from './state';
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
export {
  chooseStockSpace,
  listStatus,
  listWriter,
  onStockStatus,
  stockSpaces,
  stockStatus,
  stockOnline,
  stockUnavailable,
  wakeStock,
} from './stock-spaces';
export type { SpaceView, SyncStatus } from './stock-spaces';
