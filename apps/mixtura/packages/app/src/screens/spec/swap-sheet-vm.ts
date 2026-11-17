// The sheet of one line in Try a Swap as data: the amount (typed entry and
// what was understood), the offered ingredients in the engine's groups and
// the search over all ingredients (docs/screens-browse.md#swap-mode). Pure.

import {
  ancestors,
  convert,
  getIngredient,
  lineRole,
  swapCandidates,
  type DisplaySystem,
  type SwapGroupKind,
  type UnitId,
} from '@mixtura/engine';
import { normalise } from '../browse/normalise';
import type { BrowseModel } from '../browse/model';
import type { SpecLine } from '../browse/types';
import { amountText } from './format';
import { type SpecView } from './session';
import { amountOfLine, parseSwapAmount, type Swap } from './swap-state';
import { swapStrings } from './swap-strings';

/** Offers shown per group before "Show more". */
export const OFFERS_SHOWN = 8;
/** Search results shown. */
export const SEARCH_SHOWN = 30;

export interface OfferVM {
  id: string;
  name: string;
  /** The place in the tree, "Spirits > Rum". */
  path: string;
  selected: boolean;
}

export interface OfferGroupVM {
  kind: SwapGroupKind;
  label: string;
  offers: OfferVM[];
  /** Offers left out until "Show more". */
  hidden: number;
  expanded: boolean;
}

export interface SwapSheetVM {
  index: number;
  title: string;
  /** Present unless the line is a `top`. */
  amount?: {
    /** What the field shows: what was typed, else the current amount. */
    text: string;
    /** What was understood, "= 22.5 ml"; absent while the text is not an amount. */
    understood?: string;
  };
  topNote?: string;
  /** The saved ingredient, when another one is chosen. */
  saved?: { id: string; name: string };
  currentName: string;
  changed: boolean;
  groups: OfferGroupVM[];
  /** True when the engine knows no candidate: only the search is offered. */
  noOffers: boolean;
  /** Why, when the ingredient has no role. */
  rolelessNote?: string;
  search: { query: string; results: OfferVM[]; none: boolean };
}

function pathOf(model: BrowseModel, id: string): string {
  const chain = (ancestors(model.tree, id) ?? []).slice().reverse();
  return chain.map((a) => model.ingredientName(a) ?? a).join(' › ');
}

export function sheetVM(
  model: BrowseModel,
  saved: readonly SpecLine[],
  effective: readonly SpecLine[],
  swap: Swap,
  index: number,
  view: SpecView,
  system: DisplaySystem,
): SwapSheetVM | undefined {
  const original = saved[index];
  const line = effective[index];
  if (!original || !line) return undefined;
  const nameOf = (id: string): string => model.ingredientName(id) ?? id;
  const offer = (id: string): OfferVM => ({
    id,
    name: nameOf(id),
    path: pathOf(model, id),
    selected: id === line.ingredientId,
  });
  const role = lineRole(model.tree, original);
  const candidates = swapCandidates(
    model.tree,
    original.ingredientId,
    original.role ? { role: original.role } : {},
  );
  const hasRole = 'role' in role;
  const groups: OfferGroupVM[] = candidates.groups.map((group) => {
    const expanded = view.swapMore.includes(group.kind);
    const shown = expanded ? group.ids : group.ids.slice(0, OFFERS_SHOWN);
    const label =
      group.kind === 'class'
        ? hasRole
          ? swapStrings.groups.classRole
          : swapStrings.groups.class
        : swapStrings.groups[group.kind];
    return {
      kind: group.kind,
      label,
      offers: shown.map(offer),
      hidden: group.ids.length - shown.length,
      expanded,
    };
  });

  const query = normalise(view.swapQuery);
  const words = query.split(' ').filter(Boolean);
  const results: OfferVM[] = [];
  if (words.length > 0) {
    const matches = model.tree.ids
      .filter((id) => {
        const text = normalise(nameOf(id));
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => {
        const rank = (id: string): number =>
          normalise(nameOf(id)).startsWith(words[0] ?? '') ? 0 : 1;
        return (
          rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b), 'en', { sensitivity: 'base' })
        );
      });
    results.push(...matches.slice(0, SEARCH_SHOWN).map(offer));
  }

  const vm: SwapSheetVM = {
    index,
    title: swapStrings.sheetTitle(nameOf(line.ingredientId)),
    currentName: nameOf(line.ingredientId),
    changed: swap.lines[index] !== undefined,
    groups,
    noOffers: groups.length === 0,
    search: { query: view.swapQuery, results, none: words.length > 0 && results.length === 0 },
  };
  if (line.ingredientId !== original.ingredientId) {
    vm.saved = { id: original.ingredientId, name: nameOf(original.ingredientId) };
  }
  if (!hasRole && getIngredient(model.tree, original.ingredientId)) {
    vm.rolelessNote = swapStrings.roleless;
  }
  if (line.unit === 'top') vm.topNote = swapStrings.topNote;
  else {
    const typed = view.swapField?.index === index ? view.swapField.text : undefined;
    const current = amountOfLine(line);
    const text = typed ?? amountText({ amount: current.value, unit: current.unit }, system);
    const parsed = parseSwapAmount(text, line.unit);
    const ml = parsed.ok
      ? convert(parsed.amount as { value: number; unit: UnitId }, 'ml')
      : undefined;
    const shown = parsed.ok
      ? ml?.ok
        ? amountText({ amount: ml.value.value, unit: 'ml' }, 'metric')
        : amountText({ amount: parsed.amount.value, unit: parsed.amount.unit }, system)
      : undefined;
    vm.amount = {
      text,
      ...(shown !== undefined && { understood: swapStrings.understood(shown) }),
    };
  }
  return vm;
}
