// One repository per entity: the same four calls, each bound to its store,
// schema and id rule. Specs add the lineage view that versions (#26) need.

import { createRepo, type Repo, type RepoContext } from './repo';
import type { Affinity, Ingredient, Place, Spec, StockKey, StockRecord, Template } from './types';

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

export const placesRepo = (context: RepoContext): Repo<Place> =>
  createRepo<Place>(context, { store: 'places', kind: 'place', userIdFields: ['id'] });

/**
 * Stock is keyed by place and ingredient; the ingredient may be a seed id, the place is a
 * user id. A removed record is a tombstone put, not a delete (docs/data-model.md#stock).
 */
export const stockRepo = (context: RepoContext): Repo<StockRecord, StockKey> =>
  createRepo<StockRecord, StockKey>(context, {
    store: 'stock',
    kind: 'stock',
    userIdFields: ['placeId'],
  });

export interface SpecsRepo extends Repo<Spec> {
  /** Every version of one drink, oldest first. */
  versionsOf(lineageId: string): Promise<Spec[]>;
  /** Deletes every version of one drink, unless something still uses them (store/references.ts). */
  deleteLineage(lineageId: string): Promise<void>;
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
    async deleteLineage(lineageId) {
      for (const version of await repo.listBy('lineageId', lineageId))
        await repo.delete(version.id);
    },
  };
}
