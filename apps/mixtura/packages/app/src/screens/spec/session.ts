// Temporary state of the spec screen: a what-if volume for a `top` line and
// which line is being edited. Pure helpers; the state itself lives in
// `AppState.specView`, so the shell redraws on a change. Nothing here is
// stored: it is gone on reload or when another drink is opened
// (docs/screens-specs.md#what-if-volume-of-a-top).

import { parseVolume, type Volume } from './volume-text';

export interface SpecView {
  /** The drink this state belongs to; another drink starts from the defaults. */
  lineage: string | null;
  /** What-if volumes in ml by line index. */
  topMl: Readonly<Record<number, number>>;
  /** Index of the top line whose volume field is open. */
  editingTop: number | null;
  /** Try a Swap: the search text of the line sheet; empty when none. */
  swapQuery: string;
  /** Try a Swap: groups of offers shown in full (`class`, `role`, `near`). */
  swapMore: readonly string[];
  /** Try a Swap: the amount as typed in the line sheet, kept while it is a valid amount. */
  swapField: { index: number; text: string } | null;
}

export const initialSpecView: SpecView = {
  lineage: null,
  topMl: {},
  editingTop: null,
  swapQuery: '',
  swapMore: [],
  swapField: null,
};

/** The line sheet starts from a clean search and field. */
export function openSwapLine(view: SpecView, lineage: string): SpecView {
  return { ...viewFor(view, lineage), swapQuery: '', swapMore: [], swapField: null };
}

export function setSwapQuery(view: SpecView, lineage: string, query: string): SpecView {
  return { ...viewFor(view, lineage), swapQuery: query };
}

export function showMoreOffers(view: SpecView, lineage: string, kind: string): SpecView {
  const current = viewFor(view, lineage);
  const more = current.swapMore.includes(kind)
    ? current.swapMore.filter((k) => k !== kind)
    : [...current.swapMore, kind];
  return { ...current, swapMore: more };
}

export function setSwapField(
  view: SpecView,
  lineage: string,
  field: SpecView['swapField'],
): SpecView {
  return { ...viewFor(view, lineage), swapField: field };
}

/** The state of one drink: the stored one if it is that drink's, else the defaults. */
export function viewFor(view: SpecView, lineage: string): SpecView {
  return view.lineage === lineage ? view : { ...initialSpecView, lineage };
}

export function openTopField(view: SpecView, lineage: string, index: number | null): SpecView {
  return { ...viewFor(view, lineage), editingTop: index };
}

export function setTopMl(
  view: SpecView,
  lineage: string,
  index: number,
  ml: number | null,
): SpecView {
  const current = viewFor(view, lineage);
  const kept = Object.entries(current.topMl).filter(([key]) => Number(key) !== index);
  const topMl = Object.fromEntries(ml === null ? kept : [...kept, [String(index), ml]]);
  return { ...current, topMl, editingTop: null };
}

/** Largest volume accepted for a top, in ml. */
export const MAX_TOP_ML = 2000;

export type TopVolume = Volume;

/** Reads a top's volume: as {@link parseVolume}, up to 2000 ml. */
export function parseTopVolume(text: string): TopVolume {
  return parseVolume(text, MAX_TOP_ML);
}
