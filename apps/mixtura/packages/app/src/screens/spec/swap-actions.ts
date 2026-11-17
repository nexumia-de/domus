// What the buttons of Try a Swap do: every change is a new address (the swap
// is in the URL), applied with `replace` so Back leaves the swap instead of
// stepping through it. Nothing is stored (docs/screens-browse.md#swap-mode).

import type { SwapSheetActions } from '../../components/swap-sheet';
import { resetSwapSheetScroll } from '../../components/swap-sheet';
import { back, go, replace } from '../../navigation';
import { formatHash, type Route } from '../../router';
import { type AppState } from '../../app-state';
import { type Store } from '../../state';
import { showToast } from '../../toasts';
import type { SpecLine } from '../browse/types';
import { openSwapLine, setSwapField, setSwapQuery, showMoreOffers } from './session';
import {
  amountOfLine,
  noSwap,
  parseSwapAmount,
  stepAmount,
  swapOf,
  withAmount,
  withIngredient,
  withoutLine,
  withSwapQuery,
  type Swap,
} from './swap-state';
import { swapStrings } from './swap-strings';

export interface SwapActions extends SwapSheetActions {
  /** Starts swap mode (a new history entry, so Back leaves it). */
  start(): void;
  /** Opens the sheet of a line. */
  openLine(index: number): void;
  /** All lines back to the saved spec, with Undo. */
  resetAll(): void;
}

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;

/** The sheet parameter of a line sheet, `line-2`; null when no line sheet is open. */
export function sheetLineOf(query: URLSearchParams): number | null {
  const m = /^line-(\d+)$/.exec(query.get('sheet') ?? '');
  return m ? Number(m[1]) : null;
}

function addressOf(route: Route, swap: Swap | null, line: number | null): string {
  const query = withSwapQuery(route.query, swap);
  if (line === null) query.delete('sheet');
  else query.set('sheet', `line-${line}`);
  return formatHash(route.path, query);
}

export function swapActions(
  store: Store<AppState>,
  route: Route,
  lineage: string,
  lines: readonly SpecLine[],
  line: number | null,
): SwapActions {
  const swap = swapOf(route.query) ?? noSwap;
  const at = (n: number): SpecLine => lines[n] as SpecLine;
  const apply = (next: Swap, forLine: number | null = line): void =>
    replace(store, addressOf(route, next, forLine));
  const effective = (n: number): SpecLine => {
    const change = swap.lines[n];
    const base = at(n);
    return {
      ...base,
      ...(change?.amount && { amount: change.amount.value, unit: change.amount.unit }),
    };
  };
  const field = (text: string | null): void => {
    if (line === null) return;
    store.set({
      specView: setSwapField(
        store.get().specView,
        lineage,
        text === null ? null : { index: line, text },
      ),
    });
  };
  return {
    start: () => go(store, addressOf(route, noSwap, null)),
    openLine(index) {
      resetSwapSheetScroll();
      store.set({ specView: openSwapLine(store.get().specView, lineage) });
      (wide() ? replace : go)(store, addressOf(route, swap, index));
    },
    close() {
      const without = addressOf(route, swap, null);
      if (wide()) replace(store, without);
      else back(store, without);
    },
    resetAll() {
      const before = swap;
      replace(store, addressOf(route, noSwap, null));
      showToast(store, swapStrings.toastReset, () =>
        replace(store, addressOf(route, before, null)),
      );
    },
    step(direction) {
      if (line === null) return;
      const next = stepAmount(amountOfLine(effective(line)), direction);
      field(null);
      apply(withAmount(swap, line, next, at(line)));
    },
    typeAmount(text) {
      if (line === null) return;
      const parsed = parseSwapAmount(text, effective(line).unit);
      if (!parsed.ok) return;
      field(text);
      apply(withAmount(swap, line, parsed.amount, at(line)));
    },
    chooseIngredient(id) {
      if (line !== null) apply(withIngredient(swap, line, id, at(line)));
    },
    useSaved() {
      if (line !== null) apply(withIngredient(swap, line, at(line).ingredientId, at(line)));
    },
    resetLine() {
      if (line === null) return;
      field(null);
      apply(withoutLine(swap, line));
    },
    search: (query) => store.set({ specView: setSwapQuery(store.get().specView, lineage, query) }),
    toggleMore: (kind) =>
      store.set({ specView: showMoreOffers(store.get().specView, lineage, kind) }),
  };
}
