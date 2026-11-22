// Which stock items can satisfy a line: the tree is the class mechanism (a line naming a parent
// takes any descendant), the state must fit, and, as a separate and reported tier, a sibling.
import { isA } from '../model';
import { substitutesByParent } from '../substitutes/lookup';
import type { Substitute } from '../substitutes/types';
import type { ComponentRef, FoodState } from '../components/types';
import { byUseBy } from './context';
import type { Context, Item } from './context';

export interface Wanted {
  ref: ComponentRef;
  state?: FoodState;
}

export interface Eligible {
  /** Items that fit by reference and state, earliest use-by first. */
  items: Item[];
  /** Items of the right reference whose state does not fit. */
  stateMismatch: Item[];
}

/** Whether the item is the line's ingredient or below it, or the same component family. */
function sameThing(ctx: Context, want: Wanted, item: Item): boolean {
  if (want.ref.kind !== item.ref.kind) return false;
  const id = ctx.headId(want.ref);
  return want.ref.kind === 'component'
    ? item.refId === id
    : item.refId === id || isA(ctx.tree, item.refId, id);
}

/**
 * Rule: a stored state must equal the line's state when both are given; a raw stock item never
 * stands for a component (a prepared thing); an item without a state fits any line.
 */
function stateFits(want: Wanted, item: Item): boolean {
  if (item.state === undefined) return true;
  if (want.ref.kind === 'component' && item.state === 'raw') return false;
  return want.state === undefined || want.state === item.state;
}

/** The items of the line's own tier: exact ingredient, a descendant, or the same component family. */
export function eligibleItems(ctx: Context, want: Wanted): Eligible {
  const same = ctx.items.filter((i) => sameThing(ctx, want, i));
  return {
    items: byUseBy(same.filter((i) => stateFits(want, i))),
    stateMismatch: byUseBy(same.filter((i) => !stateFits(want, i))),
  };
}

/**
 * Sibling substitution: a line that names a leaf ingredient with a parent may take an item of
 * another child of that parent (or below it). The ingredient in stock that would be used first
 * is the substitute; all its items are returned. Empty when the rule is off, the line names a
 * class (an ingredient with children), a root or a component.
 */
export function siblingItems(
  ctx: Context,
  want: Wanted,
): { substitute: string; items: Item[] } | undefined {
  if (!ctx.sibling || want.ref.kind !== 'ingredient') return undefined;
  const ingredient = ctx.tree.byId.get(want.ref.id);
  if (ingredient?.parentId === undefined) return undefined;
  if ((ctx.tree.children.get(want.ref.id) ?? []).length > 0) return undefined;
  const siblings = (ctx.tree.children.get(ingredient.parentId) ?? []).filter(
    (s) => s !== want.ref.id,
  );
  const fitting = byUseBy(
    ctx.items.filter(
      (i) =>
        i.ref.kind === 'ingredient' &&
        stateFits(want, i) &&
        siblings.some((s) => i.refId === s || isA(ctx.tree, i.refId, s)),
    ),
  );
  const first = fitting[0];
  if (first === undefined) return undefined;
  return { substitute: first.refId, items: fitting.filter((i) => i.refId === first.refId) };
}

/**
 * Declared substitution: a line that names an ingredient may take stock of the `to` of a substitute
 * declared for it or for a group above it (nearest first, then by id). The first substitute with
 * stock that fits wins; the ingredient in stock that would be used first is the substitute and all
 * its items are returned. Empty when there are no declared substitutes or the line is a component.
 */
export function declaredItems(
  ctx: Context,
  want: Wanted,
): { effect: Substitute; substitute: string; items: Item[] } | undefined {
  if (ctx.substitutes.length === 0 || want.ref.kind !== 'ingredient') return undefined;
  const declared = substitutesByParent(
    want.ref.id,
    (id) => ctx.tree.byId.get(id)?.parentId,
    ctx.substitutes,
  );
  for (const effect of declared) {
    const fitting = byUseBy(
      ctx.items.filter(
        (i) =>
          i.ref.kind === 'ingredient' &&
          stateFits(want, i) &&
          (i.refId === effect.to || isA(ctx.tree, i.refId, effect.to)),
      ),
    );
    const first = fitting[0];
    if (first !== undefined) {
      return {
        effect,
        substitute: first.refId,
        items: fitting.filter((i) => i.refId === first.refId),
      };
    }
  }
  return undefined;
}

/** How many steps `id` is below `ancestor` in the tree; undefined when it is not below it. */
export function depthBelow(ctx: Context, id: string, ancestor: string): number | undefined {
  let steps = 0;
  const seen = new Set<string>();
  for (let at = ctx.tree.byId.get(id)?.parentId; at !== undefined;) {
    steps += 1;
    if (at === ancestor) return steps;
    if (seen.has(at)) return undefined;
    seen.add(at);
    at = ctx.tree.byId.get(at)?.parentId;
  }
  return undefined;
}

/**
 * A group in stock: a line that names an ingredient may take an item of a group above it (an
 * ancestor in the tree). The nearest group with a fitting item wins, then the item used first; all
 * items of that group are returned. Empty when the rule is off or the line names a component.
 */
export function groupItems(
  ctx: Context,
  want: Wanted,
): { inStock: string; items: Item[] } | undefined {
  if (!ctx.group || want.ref.kind !== 'ingredient') return undefined;
  const asked = want.ref.id;
  let best: { inStock: string; depth: number } | undefined;
  for (const item of byUseBy(ctx.items)) {
    if (item.ref.kind !== 'ingredient' || !stateFits(want, item)) continue;
    const depth = depthBelow(ctx, asked, item.refId);
    if (depth !== undefined && (best === undefined || depth < best.depth)) {
      best = { inStock: item.refId, depth };
    }
  }
  if (best === undefined) return undefined;
  const chosen = best.inStock;
  return {
    inStock: chosen,
    items: byUseBy(
      ctx.items.filter(
        (i) => i.ref.kind === 'ingredient' && i.refId === chosen && stateFits(want, i),
      ),
    ),
  };
}

/**
 * A whole in stock: a line that names a part exactly (as `input.parts` lists it) may take an item
 * of the whole or below it. The whole whose item is used first wins; all items of that ingredient
 * are returned. Empty when no part is declared for the line or the line names a component.
 */
export function partItems(
  ctx: Context,
  want: Wanted,
): { inStock: string; items: Item[] } | undefined {
  if (ctx.parts.length === 0 || want.ref.kind !== 'ingredient') return undefined;
  const asked = want.ref.id;
  const wholes = ctx.parts.filter((p) => p.parts.includes(asked)).map((p) => p.whole);
  if (wholes.length === 0) return undefined;
  const fitting = byUseBy(
    ctx.items.filter(
      (i) =>
        i.ref.kind === 'ingredient' &&
        stateFits(want, i) &&
        wholes.some((w) => i.refId === w || isA(ctx.tree, i.refId, w)),
    ),
  );
  const first = fitting[0];
  if (first === undefined) return undefined;
  return { inStock: first.refId, items: fitting.filter((i) => i.refId === first.refId) };
}
