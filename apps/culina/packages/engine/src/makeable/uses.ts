// Which own components and dishes use an ingredient, or one it can stand in for: the question
// "what uses the leeks". The rules are the ones that decide a line: the same ingredient, a line
// that names a class above it, and (when siblings are allowed) a leaf line beside it.
import { familyHeads } from '../versions/chain';
import { isA } from '../model';
import { buildContext } from './context';
import type { Context } from './context';
import type { MakeableComponent, MakeableError, MakeableDish, MakeableInput } from './types';

export type UsesIngredientResult =
  | { ok: true; records: { kind: 'component' | 'dish'; id: string }[] }
  | { ok: false; error: MakeableError };

/** Whether an item of `ingredientId` could satisfy a line that names the ingredient `askedId`. */
function standsFor(ctx: Context, ingredientId: string, askedId: string): boolean {
  if (ingredientId === askedId || isA(ctx.tree, ingredientId, askedId)) return true;
  if (!ctx.sibling) return false;
  const asked = ctx.tree.byId.get(askedId);
  if (asked?.parentId === undefined) return false;
  if ((ctx.tree.children.get(askedId) ?? []).length > 0) return false;
  return (ctx.tree.children.get(asked.parentId) ?? []).some(
    (s) => s !== askedId && (s === ingredientId || isA(ctx.tree, ingredientId, s)),
  );
}

type Ref = { kind: 'ingredient' | 'component'; id: string };

/** Whether any line of the component (or of a component it is made of) takes the ingredient. */
function componentUses(
  ctx: Context,
  ingredientId: string,
  component: MakeableComponent,
  seen: ReadonlySet<string>,
): boolean {
  const below = new Set([...seen, component.id]);
  return component.lines.some((l) => refUses(ctx, ingredientId, l.ref, below));
}

function refUses(ctx: Context, ingredientId: string, ref: Ref, seen: ReadonlySet<string>): boolean {
  if (ref.kind === 'ingredient') return standsFor(ctx, ingredientId, ref.id);
  const head = ctx.components.get(ctx.headId(ref));
  return head !== undefined && !seen.has(head.id) && componentUses(ctx, ingredientId, head, seen);
}

/**
 * @param input - As for `makeable`; the ingredients, components, dishes and the
 *   `siblingSubstitution` option are read, the stock is only checked.
 * @param ingredientId - The ingredient to start from.
 * @returns The family heads of components and dishes with a line (or a slot, or a line of a
 *   component they are made of) that names the ingredient, a class above it, or, when sibling
 *   substitution is on, a leaf beside it; in the ranking's name and id order. Ratio templates
 *   are not listed. Or the input's tree or date error.
 */
export function usesIngredient(input: MakeableInput, ingredientId: string): UsesIngredientResult {
  const built = buildContext(input);
  if (!built.ok) return built;
  const { ctx } = built;
  const found: { kind: 'component' | 'dish'; id: string; name: string }[] = [];
  for (const c of familyHeads(input.components ?? []) as MakeableComponent[]) {
    if (componentUses(ctx, ingredientId, c, new Set())) {
      found.push({ kind: 'component', id: c.id, name: c.name });
    }
  }
  for (const d of familyHeads(input.dishes ?? []) as MakeableDish[]) {
    if (d.slots.some((s) => refUses(ctx, ingredientId, s.ref, new Set()))) {
      found.push({ kind: 'dish', id: d.id, name: d.name });
    }
  }
  found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1));
  return { ok: true, records: found.map(({ kind, id }) => ({ kind, id })) };
}
