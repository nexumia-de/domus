// The one adapter between Culina's records and materia: the ingredient tree (`buildTree`),
// inherited roles (`inheritedValue`), ancestry (`isA`) and day numbers (`dayNumber`).
// Everything else the finder needs (amounts, state, partial matches) has no materia shape.
import { inheritedValue } from '@nexumia-de/materia';
import { buildTree, dayNumber } from '../model';
import { familyHeads } from '../versions/chain';
import type { BaseIngredient, IngredientTreeOf } from '@nexumia-de/materia';
import type { ComponentRef } from '../components/types';
import type { Substitute } from '../substitutes/types';
import type { MakeableComponent, MakeableError, MakeableInput, MakeableStockItem } from './types';

type TreeIngredient = BaseIngredient & { roles?: readonly string[] };

/** A stock item with its reference resolved to the family head and its use-by as a day number. */
export interface Item extends MakeableStockItem {
  /** Ingredient id, or the head id of a component's family. */
  refId: string;
  /** Day number of `useBy`; absent without one. */
  day?: number;
}

export interface Context {
  tree: IngredientTreeOf<TreeIngredient>;
  facts: NonNullable<MakeableInput['facts']>;
  sibling: boolean;
  substitutes: readonly Substitute[];
  items: readonly Item[];
  components: ReadonlyMap<string, MakeableComponent>;
  /** Today as a day number. */
  today: number;
  headId(ref: ComponentRef): string;
}

type Built = { ok: true; ctx: Context } | { ok: false; error: MakeableError };

/** Maps record id to the id of its family's head, for any version. */
export function headIndex(
  records: readonly { id: string; version: { family: string; date: string; parent?: string } }[],
): (id: string) => string {
  const byFamily = new Map(familyHeads(records).map((h) => [h.version.family, h.id]));
  const byId = new Map(records.map((r) => [r.id, byFamily.get(r.version.family) ?? r.id]));
  return (id) => byId.get(id) ?? id;
}

/** Builds the tree and resolves stock and component references; the first wrong date or tree error fails. */
export function buildContext(input: MakeableInput): Built {
  const tree = buildTree<TreeIngredient>(
    input.ingredients.map((i) => ({
      id: i.id,
      name: i.id,
      level: 'type' as const,
      ...(i.parentId !== undefined ? { parentId: i.parentId } : {}),
      ...(i.roles !== undefined ? { roles: i.roles } : {}),
    })),
  );
  if (!tree.ok) {
    return { ok: false, error: { code: 'invalid-tree', ids: tree.errors.flatMap((e) => e.ids) } };
  }
  const today = dayNumber(input.today);
  if (today === undefined) return { ok: false, error: { code: 'invalid-date' } };
  const components = input.components ?? [];
  const head = headIndex(components);
  const heads = new Map(familyHeads(components).map((c) => [c.id, c]));
  const headId = (ref: ComponentRef): string => (ref.kind === 'component' ? head(ref.id) : ref.id);
  const items: Item[] = [];
  for (const s of input.stock) {
    const day = s.useBy === undefined ? undefined : dayNumber(s.useBy);
    if (s.useBy !== undefined && day === undefined) {
      return { ok: false, error: { code: 'invalid-date', itemId: s.id } };
    }
    items.push({ ...s, refId: headId(s.ref), ...(day !== undefined ? { day } : {}) });
  }
  const ctx: Context = {
    tree: tree.tree,
    facts: input.facts ?? {},
    sibling: input.options?.siblingSubstitution ?? true,
    substitutes: input.substitutes ?? [],
    items,
    components: heads,
    today,
    headId,
  };
  return { ok: true, ctx };
}

/** Roles of an ingredient, inherited from the nearest ancestor that has them; empty when none. */
export function rolesOf(ctx: Context, ingredientId: string): readonly string[] {
  const found = inheritedValue(ctx.tree, ingredientId, 'roles');
  return found.value ?? [];
}

/** Items by earliest use-by, none last, then id: the order in which they would be used. */
export function byUseBy<T extends { day?: number; id: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => (a.day ?? Infinity) - (b.day ?? Infinity) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
