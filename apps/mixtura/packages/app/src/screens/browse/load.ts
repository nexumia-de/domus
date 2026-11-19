// Loads the browse model from the catalog once per catalog and keeps it.
// Screens are synchronous, so a screen asks `browseState` on every draw: it
// answers "loading" at first and the finished load bumps `browseRev`, which
// redraws. A later write path (the editor) calls `invalidateBrowse`.

import { type AppState } from '../../app-state';
import { type ScreenContext } from '../../screen';
import { type Store } from '../../state';
import { type Catalog } from '../../store';
import { buildModel, type BrowseModel } from './model';
import type { Ingredient, SpecData, Template } from './types';

export type BrowseState =
  { kind: 'loading' } | { kind: 'failed'; reason: string } | { kind: 'ready'; model: BrowseModel };

let cache: { catalog: Catalog; state: BrowseState } | undefined;

export function invalidateBrowse(): void {
  cache = undefined;
}

async function load(catalog: Catalog): Promise<BrowseState> {
  const [ingredients, templates, specs] = await Promise.all([
    catalog.ingredients.list(),
    catalog.templates.list(),
    catalog.specs.list(),
  ]);
  const built = buildModel({
    ingredients: ingredients.map((e) => e.value as Ingredient),
    templates: templates.map((e) => ({ value: e.value as unknown as Template, origin: e.origin })),
    specs: specs.map((e) => ({ value: e.value as unknown as SpecData, origin: e.origin })),
    vocabulary: catalog.vocabulary,
    attribution: catalog.attribution,
    seedVersion: catalog.seedVersion,
  });
  return built.ok
    ? { kind: 'ready', model: built.model }
    : { kind: 'failed', reason: built.reason };
}

/**
 * Reads the catalog again after the user's own data changed (the editor
 * saved a drink or an ingredient). The model drawn so far stays on screen
 * until the new one is ready, so no screen flashes "Loading".
 */
export function refreshBrowse(store: Store<AppState>, catalog: Catalog): Promise<void> {
  const old = cache?.state;
  const entry: { catalog: Catalog; state: BrowseState } = {
    catalog,
    state: old?.kind === 'ready' ? old : { kind: 'loading' },
  };
  cache = entry;
  const finish = (loaded: BrowseState): void => {
    entry.state = loaded;
    if (cache === entry) store.set({ browseRev: store.get().browseRev + 1 });
  };
  return load(catalog).then(finish, (error: unknown) =>
    finish({ kind: 'failed', reason: (error as Error).message }),
  );
}

export function browseState({ state, store, data }: ScreenContext): BrowseState {
  if (state.seed.kind === 'failed') return { kind: 'failed', reason: state.seed.reason };
  if (state.seed.kind === 'loading' || state.storage.kind === 'opening') return { kind: 'loading' };
  const catalog = data.catalog();
  if (cache?.catalog === catalog) return cache.state;
  const entry: { catalog: Catalog; state: BrowseState } = { catalog, state: { kind: 'loading' } };
  cache = entry;
  load(catalog).then(
    (loaded) => finish(entry, loaded),
    (error: unknown) => finish(entry, { kind: 'failed', reason: (error as Error).message }),
  );
  function finish(target: typeof entry, loaded: BrowseState): void {
    target.state = loaded;
    if (cache === target) store.set({ browseRev: store.get().browseRev + 1 });
  }
  return entry.state;
}
