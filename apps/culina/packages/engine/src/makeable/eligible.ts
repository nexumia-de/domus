// Which stock items can satisfy a line: the tree is the class mechanism (a line naming a parent
// takes any descendant), the state must fit, and, as a separate and reported tier, a sibling.
import { isA } from '../model';
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
