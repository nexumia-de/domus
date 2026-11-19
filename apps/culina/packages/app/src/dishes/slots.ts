// The slots of one dish: the filling, the amount per portion and the total for a number of portions.
import { toGrams, unitKind } from '@culina/engine';
import { explain, refName, roleInvite, roleLabel } from '../components/names';
import type { DishRecord, Notebook, SlotRecord } from '../records';
import { strings } from '../strings';
import { inviteText, openRoles } from './roles';

export interface SlotRow {
  role: string;
  roleLabel: string;
  kind: 'ingredient' | 'component';
  id: string;
  name: string;
  /** True when a component slot can be opened: the component is in the notebook. */
  linked: boolean;
  optional: boolean;
  perPortionG?: number;
  totalG?: number;
  /** Plain words when the amount cannot be shown or the filling is not in the notebook. */
  problem?: string;
}

export interface OpenRow {
  role: string;
  text: string;
  /** What is there for the role: "You could add a crunch: toasted nuts". */
  offer?: string;
}

const amountOf = (nb: Notebook, slot: SlotRecord): number | string | undefined => {
  if (slot.amount === undefined) return undefined;
  if (slot.ref.kind === 'component' && unitKind(slot.amount.unit) !== 'mass') {
    return strings.notebook.problem.needsMass(refName(nb, slot.ref));
  }
  const grams = toGrams(
    slot.amount,
    slot.ref.kind === 'ingredient' ? nb.facts[slot.ref.id] : undefined,
  );
  return grams.ok ? grams.g : strings.notebook.problem.cannotConvert(refName(nb, slot.ref));
};

/** One row per stored slot, in stored order; `portions` is the number the cook chose. */
export const slotRows = (nb: Notebook, dish: DishRecord, portions: number): SlotRow[] =>
  dish.slots.map((slot): SlotRow => {
    const known = slot.ref.kind === 'ingredient' || nb.components.some((c) => c.id === slot.ref.id);
    const row: SlotRow = {
      role: slot.role,
      roleLabel: roleLabel(slot.role),
      kind: slot.ref.kind,
      id: slot.ref.id,
      name: refName(nb, slot.ref),
      linked: slot.ref.kind === 'component' && known,
      optional: slot.optional === true,
    };
    if (!known) {
      row.problem = explain({ code: 'unknown-component', componentId: slot.ref.id }, nb);
      return row;
    }
    const amount = amountOf(nb, slot);
    if (typeof amount === 'number') {
      row.perPortionG = amount;
      row.totalG = amount * portions;
    } else if (amount !== undefined) row.problem = amount;
    else row.problem = strings.dishes.noAmount(row.name);
    return row;
  });

/**
 * Invitations for the roles the dish does not fill. `offers` gives the names in stock for a role;
 * a role with none has no offer.
 */
export const openRows = (
  dish: DishRecord,
  offers: (role: string) => string[] = () => [],
): OpenRow[] =>
  openRoles(dish.slots.map((s) => s.role)).map((role) => {
    const names = offers(role);
    return {
      role,
      text: inviteText(role),
      ...(names.length > 0
        ? { offer: strings.cook.offer(roleInvite(role), names.join(', ')) }
        : {}),
    };
  });
