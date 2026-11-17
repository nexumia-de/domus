// The one read API for screens and the engine's inputs: seed data with the
// user's own entities on top. Seed entities are read-only and win on an id
// clash; the data model keeps user ids (`u-<uuid>`) out of the seed's
// namespace, so a clash can only come from damaged or hand-edited data and
// is reported, never merged (docs/data-model.md#ids).

import type { Repo } from './repo';
import type { Seed } from './seed';
import type { Affinity, Ingredient, Spec, Template } from './types';

export interface Entry<T> {
  value: T;
  origin: 'seed' | 'user';
}

export interface Overlay<T> {
  entries: Entry<T>[];
  /** User ids hidden because a seed entity has the same id. */
  shadowed: string[];
}

export function overlay<T extends { id: string }>(
  seed: readonly T[],
  user: readonly T[],
): Overlay<T> {
  const taken = new Set(seed.map((s) => s.id));
  const entries: Entry<T>[] = seed.map((value) => ({ value, origin: 'seed' }));
  const shadowed: string[] = [];
  for (const value of user) {
    if (taken.has(value.id)) shadowed.push(value.id);
    else entries.push({ value, origin: 'user' });
  }
  return { entries, shadowed };
}

export interface CatalogView<T> {
  list(): Promise<Entry<T>[]>;
  get(id: string): Promise<Entry<T> | undefined>;
  shadowed(): Promise<string[]>;
}

export interface Catalog {
  seedVersion: string;
  ingredients: CatalogView<Ingredient>;
  templates: CatalogView<Template>;
  specs: CatalogView<Spec>;
  affinities: CatalogView<Affinity>;
}

/** `null` user repositories (read-only mode) give the seed alone. */
export interface UserRepos {
  ingredients: Repo<Ingredient>;
  templates: Repo<Template>;
  specs: Repo<Spec>;
  affinities: Repo<Affinity>;
}

function view<T extends { id: string }>(
  seed: readonly T[],
  user: Repo<T> | undefined,
): CatalogView<T> {
  const combined = async (): Promise<Overlay<T>> => overlay(seed, user ? await user.list() : []);
  return {
    list: async () => (await combined()).entries,
    async get(id) {
      const hit = seed.find((s) => s.id === id);
      if (hit) return { value: hit, origin: 'seed' };
      const own = user ? await user.get(id) : undefined;
      return own ? { value: own, origin: 'user' } : undefined;
    },
    shadowed: async () => (await combined()).shadowed,
  };
}

export function createCatalog(seed: Seed, user: UserRepos | null): Catalog {
  return {
    seedVersion: seed.seedVersion,
    ingredients: view(seed.ingredients, user?.ingredients),
    templates: view(seed.templates, user?.templates),
    specs: view(seed.specs, user?.specs),
    affinities: view(seed.affinities, user?.affinities),
  };
}
