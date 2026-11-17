// One repository per entity: the same four calls, each bound to its store,
// schema and id rule. Specs add the lineage view that versions (#26) need.

import { createRepo, type Repo, type RepoContext } from './repo';
import type { Affinity, Ingredient, Spec, Stock, Template } from './types';

export const ingredientsRepo = (context: RepoContext): Repo<Ingredient> =>
  createRepo<Ingredient>(context, {
    store: 'ingredients',
    kind: 'ingredient',
    userIdFields: ['id'],
  });

export const templatesRepo = (context: RepoContext): Repo<Template> =>
  createRepo<Template>(context, { store: 'templates', kind: 'template', userIdFields: ['id'] });

export const affinitiesRepo = (context: RepoContext): Repo<Affinity> =>
  createRepo<Affinity>(context, { store: 'affinities', kind: 'affinity', userIdFields: ['id'] });

/** Stock is keyed by `ingredientId`, which may be a seed id. */
export const stockRepo = (context: RepoContext): Repo<Stock> =>
  createRepo<Stock>(context, { store: 'stock', kind: 'stock' });

export interface SpecsRepo extends Repo<Spec> {
  /** Every version of one drink, oldest first. */
  versionsOf(lineageId: string): Promise<Spec[]>;
}

export function specsRepo(context: RepoContext): SpecsRepo {
  const repo = createRepo<Spec>(context, {
    store: 'specs',
    kind: 'spec',
    userIdFields: ['id', 'lineageId'],
  });
  return {
    ...repo,
    async versionsOf(lineageId) {
      const all = await repo.listBy('lineageId', lineageId);
      return all.sort((a, b) => a.version - b.version);
    },
  };
}
