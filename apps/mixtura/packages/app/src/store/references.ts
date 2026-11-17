// Deleting a user entity that others still reference is refused with a
// `referenced` StoreError that names the referrers (docs/data-model.md#ids,
// docs/store.md#references). Only the user's own entities can reference or
// be deleted; seed data is read-only.

import { StoreError, type Referrer } from './errors';
import type { Repo } from './repo';
import type { SpecsRepo } from './repo-entities';
import type { Affinity, Ingredient, Spec } from './types';

export interface GuardedRepos {
  ingredients: Repo<Ingredient>;
  specs: SpecsRepo;
}

export interface Repos {
  ingredients: Repo<Ingredient>;
  specs: SpecsRepo;
  affinities: Repo<Affinity>;
}

const unique = (referrers: Referrer[]): Referrer[] => {
  const seen = new Set<string>();
  return referrers.filter((r) => !seen.has(`${r.kind}:${r.id}`) && seen.add(`${r.kind}:${r.id}`));
};

function refuse(what: string, referrers: Referrer[]): never {
  const list = unique(referrers);
  const names = [...new Set(list.map((r) => r.name))];
  throw new StoreError('referenced', `${what} is still used by ${names.join(', ')}`, names, list);
}

/** The newest version of each lineage, for naming a drink once. */
function newest(specs: readonly Spec[]): Map<string, Spec> {
  const out = new Map<string, Spec>();
  for (const s of specs) {
    const known = out.get(s.lineageId);
    if (!known || s.version > known.version) out.set(s.lineageId, s);
  }
  return out;
}

/** Who uses an ingredient: drinks (lines and substitutes), child ingredients, affinities. */
export async function ingredientReferrers(repos: Repos, id: string): Promise<Referrer[]> {
  const [specs, ingredients, affinities] = await Promise.all([
    repos.specs.list(),
    repos.ingredients.list(),
    repos.affinities.list(),
  ]);
  const names = newest(specs);
  const out: Referrer[] = [];
  for (const spec of specs) {
    const uses = (
      spec['lines'] as { ingredientId: string; substitutes?: { ingredientId: string }[] }[]
    ).some(
      (line) =>
        line.ingredientId === id || (line.substitutes ?? []).some((s) => s.ingredientId === id),
    );
    if (uses) {
      const head = names.get(spec.lineageId) ?? spec;
      out.push({ kind: 'drink', id: spec.lineageId, name: head.name });
    }
  }
  for (const item of ingredients) {
    if (item.parentId === id) out.push({ kind: 'ingredient', id: item.id, name: item.name });
  }
  for (const affinity of affinities) {
    if (affinity.ingredients.includes(id)) {
      out.push({
        kind: 'affinity',
        id: affinity.id,
        name: String(affinity['name'] ?? 'an affinity'),
      });
    }
  }
  return out;
}

/** Who uses the versions `ids` of one drink: prepared ingredients made from it and riffs of it. */
export async function specReferrers(
  repos: Repos,
  ids: readonly string[],
  lineageId: string,
): Promise<Referrer[]> {
  const [specs, ingredients] = await Promise.all([repos.specs.list(), repos.ingredients.list()]);
  const names = newest(specs);
  const out: Referrer[] = [];
  for (const item of ingredients) {
    if (item.prepared && ids.includes(item.prepared.specId)) {
      out.push({ kind: 'prepared', id: item.id, name: item.name });
    }
  }
  for (const spec of specs) {
    if (spec.lineageId !== lineageId && spec.parentId && ids.includes(spec.parentId)) {
      const head = names.get(spec.lineageId) ?? spec;
      out.push({ kind: 'riff', id: spec.lineageId, name: head.name });
    }
  }
  return out;
}

/** Wraps the delete calls of ingredients and specs with the reference check. */
export function withReferenceChecks(repos: Repos): GuardedRepos {
  const ingredients: Repo<Ingredient> = {
    ...repos.ingredients,
    async delete(id) {
      const referrers = await ingredientReferrers(repos, id);
      if (referrers.length > 0) {
        const own = await repos.ingredients.get(id);
        refuse(own?.name ?? 'This ingredient', referrers);
      }
      await repos.ingredients.delete(id);
    },
  };
  const specs: SpecsRepo = {
    ...repos.specs,
    async delete(id) {
      const spec = await repos.specs.get(id);
      if (spec) {
        const referrers = await specReferrers(repos, [id], spec.lineageId);
        if (referrers.length > 0) refuse(spec.name, referrers);
      }
      await repos.specs.delete(id);
    },
    async deleteLineage(lineageId) {
      const versions = await repos.specs.versionsOf(lineageId);
      const referrers = await specReferrers(
        repos,
        versions.map((v) => v.id),
        lineageId,
      );
      if (referrers.length > 0) refuse(versions.at(-1)?.name ?? 'This drink', referrers);
      for (const version of versions) await repos.specs.delete(version.id);
    },
  };
  return { ingredients, specs };
}
