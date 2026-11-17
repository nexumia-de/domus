// Loads the browse model from the catalog once per catalog and keeps it.
// Screens are synchronous, so a screen asks `browseState` on every draw: it
// answers "loading" at first and the finished load bumps `browseRev`, which
// redraws. A later write path (the editor) calls `invalidateBrowse`.

import { type ScreenContext } from '../../screen';
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
