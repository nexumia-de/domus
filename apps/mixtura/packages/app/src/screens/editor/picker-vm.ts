// The ingredient picker as data: what the rows say, what browsing shows, and
// the "Create" row. Search covers the combined catalog (seed and the user's
// own); the empty search shows what was used recently and the top of the tree.

import type { BrowseModel } from '../browse/model';
import type { Ingredient } from '../browse/types';
import { normalise } from '../browse/normalise';
import { pathOf, searchIngredients } from '../spec/ingredient-search';
import { isUserId } from '../../store';
import type { PickerState } from './session';

export interface PickRow {
  id: string;
  name: string;
  /** The place in the tree, "Spirits › Rum". */
  path: string;
  prepared: boolean;
  user: boolean;
  /** Browsing opens its children. */
  hasChildren: boolean;
  /** A user ingredient that is not a prepared one can be edited in the form. */
  editable: boolean;
}

export interface PickerVM {
  query: string;
  focus: boolean;
  mode: 'search' | 'browse' | 'start';
  /** The heading of the list. */
  heading: string;
  rows: PickRow[];
  /** Recently used, on the start page. */
  recent: PickRow[];
  /** Browsing a category: where "up" goes (null for the top level). */
  up?: { id: string | null; name: string };
  /** The text of the Create row, absent when an ingredient has exactly that name. */
  create?: string;
  none: boolean;
}

export const RECENT = 8;
export const RESULTS = 30;

function row(model: BrowseModel, id: string): PickRow {
  const item = model.tree.byId.get(id) as Ingredient;
  const user = isUserId(id);
  return {
    id,
    name: item.name,
    path: pathOf(model, id),
    prepared: item.prepared !== undefined,
    user,
    hasChildren: (model.tree.children.get(id)?.length ?? 0) > 0,
    editable: user && item.prepared === undefined,
  };
}

/** Ingredient ids from the user's own drinks, newest first, each once. */
export function recentIds(model: BrowseModel): string[] {
  const own = [...model.specById.values()]
    .filter((s) => isUserId(s.id))
    .sort((a, b) =>
      (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? ''),
    );
  const seen = new Set<string>();
  for (const spec of own) {
    for (const line of spec.lines) {
      if (model.tree.byId.has(line.ingredientId)) seen.add(line.ingredientId);
      if (seen.size >= RECENT) return [...seen];
    }
  }
  return [...seen];
}

export function pickerVM(
  model: BrowseModel,
  state: PickerState,
  heading: { search: string; browse: string; start: string },
): PickerVM {
  const query = state.query;
  const text = query.trim();
  const base = { query, focus: state.focus, recent: [] as PickRow[] };
  if (text !== '') {
    const found = searchIngredients(model, text);
    const exact = found.some((id) => normalise(model.ingredientName(id) ?? '') === normalise(text));
    return {
      ...base,
      mode: 'search',
      heading: heading.search,
      rows: found.slice(0, RESULTS).map((id) => row(model, id)),
      ...(!exact && { create: text }),
      none: found.length === 0,
    };
  }
  if (state.path !== null && model.tree.byId.has(state.path)) {
    const node = model.tree.byId.get(state.path) as Ingredient;
    const kids = (model.tree.children.get(state.path) ?? []).slice().sort((a, b) =>
      (model.ingredientName(a) ?? a).localeCompare(model.ingredientName(b) ?? b, 'en', {
        sensitivity: 'base',
      }),
    );
    const parent = node.parentId;
    return {
      ...base,
      mode: 'browse',
      heading: `${heading.browse}: ${pathOf(model, state.path) ? `${pathOf(model, state.path)} › ` : ''}${node.name}`,
      rows: [row(model, state.path), ...kids.map((id) => row(model, id))],
      up: {
        id: parent ?? null,
        name: parent ? (model.ingredientName(parent) ?? parent) : heading.start,
      },
      none: false,
    };
  }
  const roots = model.tree.ids
    .filter((id) => model.tree.byId.get(id)?.parentId === undefined)
    .sort((a, b) =>
      (model.ingredientName(a) ?? a).localeCompare(model.ingredientName(b) ?? b, 'en', {
        sensitivity: 'base',
      }),
    );
  return {
    ...base,
    mode: 'start',
    heading: heading.start,
    rows: roots.map((id) => row(model, id)),
    recent: recentIds(model).map((id) => row(model, id)),
    none: false,
  };
}
