// Stock items that can play a role, so that a screen can offer candidates for an open slot.
import { buildContext, byUseBy, rolesOf } from './context';
import type { MakeableInput, StockForRoleResult } from './types';

/**
 * @param input - `ingredients`, `stock` and optionally `components` (a stock item of a component is
 *   listed when the component's `role` equals the role); `today` is checked like in `makeable`.
 * @param role - A role id (`crunch`, `acid`, ...).
 * @returns Items whose ingredient's roles, own or inherited, include the role, earliest use-by
 *   first (none last, then id); always-there items are listed; or the input's tree or date error.
 */
export function stockForRole(
  input: Pick<MakeableInput, 'ingredients' | 'components' | 'stock' | 'today'>,
  role: string,
): StockForRoleResult {
  const built = buildContext(input);
  if (!built.ok) return built;
  const { ctx } = built;
  const componentRoles = new Map([...ctx.components.values()].map((c) => [c.id, c.role]));
  const items = byUseBy(
    ctx.items.filter((i) =>
      i.ref.kind === 'ingredient'
        ? rolesOf(ctx, i.refId).includes(role)
        : componentRoles.get(i.refId) === role,
    ),
  );
  return {
    ok: true,
    items: items.map((i) => ({
      itemId: i.id,
      ingredientId: i.refId,
      ...(i.useBy !== undefined ? { useBy: i.useBy } : {}),
    })),
  };
}
