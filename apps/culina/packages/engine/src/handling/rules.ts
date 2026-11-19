// Which handling rules to show for the ingredients of a dish, given what the user has learned.
import type { HandlingRule } from './types';

/** A node of the catalogue's ingredient tree: an ingredient or a group and its parent group. */
export interface TreeNode {
  id: string;
  parentId?: string | null;
}

/** A rule to show and the ingredient of the dish it matched (the first one, in list order). */
export interface ShownRule {
  rule: HandlingRule;
  ingredient: string;
}

/** Result of `handlingRules`. */
export type HandlingResult =
  { ok: true; rules: ShownRule[] } | { ok: false; error: { code: 'cycle'; id: string } };

/** Options of `handlingRules`. */
export interface HandlingOptions {
  /**
   * The techniques the dish uses. When given, a rule shows only if its technique is one of them,
   * so that a rule about pasta water stays away from a dish without pasta. Omitted: no filter.
   */
  used?: ReadonlySet<string>;
}

/**
 * The handling rules to show for a list of ingredients. A rule matches an ingredient when its
 * target is that ingredient or any group above it in the tree; an ingredient that is not in the
 * tree (the user's own) matches only a rule that names it. A rule whose technique is learned is
 * left out. Each rule shows once, beside the first ingredient it matched.
 *
 * @param ingredients - The ingredient ids of the dish (all components together), in order.
 * @param rules - The known rules, for example the shipped ones.
 * @param tree - The catalogue's ingredients and groups with their parents.
 * @param learned - Ids of the techniques the user marked as learned.
 * @param options - Optional filter by the techniques the dish uses.
 * @returns The rules ordered by ingredient (list order), then by rule list order; or `cycle` with
 * the id where the tree loops.
 */
export function handlingRules(
  ingredients: readonly string[],
  rules: readonly HandlingRule[],
  tree: readonly TreeNode[],
  learned: ReadonlySet<string>,
  options: HandlingOptions = {},
): HandlingResult {
  const parent = new Map(tree.map((n) => [n.id, n.parentId ?? undefined]));
  const shown = new Set<string>();
  const out: ShownRule[] = [];
  for (const ingredient of ingredients) {
    // The ingredient and every group above it.
    const chain = new Set<string>();
    for (let id: string | undefined = ingredient; id !== undefined; id = parent.get(id)) {
      if (chain.has(id)) return { ok: false, error: { code: 'cycle', id } };
      chain.add(id);
    }
    for (const rule of rules) {
      if (shown.has(rule.id) || !chain.has(rule.target)) continue;
      if (learned.has(rule.technique)) continue;
      if (options.used !== undefined && !options.used.has(rule.technique)) continue;
      shown.add(rule.id);
      out.push({ rule, ingredient });
    }
  }
  return { ok: true, rules: out };
}
