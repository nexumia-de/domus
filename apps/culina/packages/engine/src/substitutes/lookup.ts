// The substitutes that apply to an ingredient: those declared for it and for the groups above it.
import type { Substitute } from './types';

/**
 * The ids from an ingredient up to its root: the ingredient first, then its parent, and so on. A
 * cycle or an unknown parent ends the chain.
 */
export function ancestry(id: string, parentOf: (id: string) => string | undefined): string[] {
  const chain: string[] = [];
  for (
    let at: string | undefined = id;
    at !== undefined && !chain.includes(at);
    at = parentOf(at)
  ) {
    chain.push(at);
  }
  return chain;
}

/**
 * The substitutes declared for an ingredient or a group above it, nearest first: those of the
 * ingredient itself, then of its parent, and so on up; within one level by id.
 *
 * @param id - The ingredient to replace.
 * @param parentOf - The parent of an ingredient id, or `undefined` for a root or an unknown id.
 * @param list - The substitutes to read, for example the shipped ones.
 * @returns The applicable substitutes in that order.
 */
export function substitutesByParent(
  id: string,
  parentOf: (id: string) => string | undefined,
  list: readonly Substitute[],
): Substitute[] {
  return ancestry(id, parentOf).flatMap((at) =>
    list.filter((s) => s.from === at).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  );
}

/**
 * The substitutes that replace an ingredient, with what changes: the ones declared for the
 * ingredient, then those for its groups, nearest first.
 *
 * @param id - The ingredient to replace.
 * @param ingredients - The ingredient tree: id and optional parent id of each ingredient.
 * @param list - The substitutes to read, for example the shipped ones.
 * @returns The applicable substitutes, nearest group first, then by id; empty when none.
 */
export function substituteEffects(
  id: string,
  ingredients: readonly { id: string; parentId?: string }[],
  list: readonly Substitute[],
): Substitute[] {
  const parents = new Map(ingredients.map((i) => [i.id, i.parentId]));
  return substitutesByParent(id, (at) => parents.get(at), list);
}
