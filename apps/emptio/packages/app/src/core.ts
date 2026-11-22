// What the app is without a screen, for a second shell: the native Linux app
// (packages/linux) shows the same list with the same actions, texts and sync.
// Nothing here touches the DOM.
export { LIST_INTERVAL_MS, createApp } from './app';
export type { App, AppOptions, AppState } from './app';
export {
  addCategory,
  addToList,
  clearBought,
  editEntry,
  removeCategory,
  removeEntries,
  renameCategory,
  restoreEntries,
  setBought,
  setCategoryHidden,
  setPriority,
} from './list/actions';
export type { EntryEdit, ListDeps, NewEntry } from './list/actions';
export { categoriesOf, orderOf } from './list/categories';
export type { Category } from './list/categories';
export { CATEGORIES, COLLECTIONS, LIST } from './list/model';
export { ago, statusText } from './list/status';
export { KEYS, THEMES, themeOf } from './prefs';
export type { Lang, Prefs, Theme } from './prefs';
export { stringsEn } from './strings';
export type { Strings } from './strings';
export { stringsDe } from './strings-de';
