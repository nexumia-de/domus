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
  /**
   * For a component slot without an amount: how many runs of the component it stands for at these
   * portions (`runsWithoutAmount`). The slot shows no amount, but it is added up.
   */
  runs?: number;
  /** Plain words when the amount cannot be shown or the filling is not in the notebook. */
  problem?: string;
}

export interface OpenRow {
  role: string;
  text: string;
  /** What is there for the role: "You could add a crunch: toasted nuts". */
  offer?: string;
}

/**
 * What one slot weighs, without names: the grams per portion where its amount converts, else what
 * keeps it from being added up (`'needs-mass'`: a component by volume or count; `'cannot-convert'`:
 * an ingredient without the figure its unit needs). `undefined` without an amount.
 */
const gramsOf = (
  nb: Pick<Notebook, 'facts'>,
  slot: SlotRecord,
): number | 'needs-mass' | 'cannot-convert' | undefined => {
  if (slot.amount === undefined) return undefined;
  if (slot.ref.kind === 'component' && unitKind(slot.amount.unit) !== 'mass') return 'needs-mass';
  const grams = toGrams(
    slot.amount,
    slot.ref.kind === 'ingredient' ? nb.facts[slot.ref.id] : undefined,
  );
  return grams.ok ? grams.g : 'cannot-convert';
};

/**
 * How many runs of its component a component slot without an amount stands for at `portions`: one
 * run for the dish's stored portions. It is the rule of a shipped dish, which counts each of its
 * components at its own amounts, so a kept copy (whose component slots carry no amount) adds up
 * and is judged as the dish it was kept from; and it is what the cook screen has always cooked
 * for such a slot at the stored portions (docs/dish-characters.md, 2026-11-24). A dish that
 * stores no portions gives no runs: how many portions one run makes is not known, and nothing is
 * guessed (the slot is then not added up, as before).
 */
export const runsWithoutAmount = (dish: DishRecord, portions: number): number | undefined =>
  dish.portions !== undefined && dish.portions > 0 ? portions / dish.portions : undefined;

/** What a slot stands for in mass: the part of a row the totals, the nutrition and the characters read. */
export type SlotMass = Pick<
  SlotRow,
  'kind' | 'id' | 'optional' | 'perPortionG' | 'totalG' | 'runs'
>;

/**
 * What one slot stands for in mass at `portions` (no names, no problem texts): its grams where its
 * amount converts; for a component slot without an amount, its runs (`runsWithoutAmount`); nothing
 * for a component the notebook lacks.
 */
export const slotMass = (
  nb: Pick<Notebook, 'facts' | 'components'>,
  dish: DishRecord,
  slot: SlotRecord,
  portions: number,
): SlotMass => {
  const mass: SlotMass = { kind: slot.ref.kind, id: slot.ref.id, optional: slot.optional === true };
  const known = slot.ref.kind === 'ingredient' || nb.components.some((c) => c.id === slot.ref.id);
  if (!known) return mass;
  const grams = gramsOf(nb, slot);
  if (typeof grams === 'number') {
    mass.perPortionG = grams;
    mass.totalG = grams * portions;
  } else if (grams === undefined && slot.ref.kind === 'component') {
    const runs = runsWithoutAmount(dish, portions);
    if (runs !== undefined) mass.runs = runs;
  }
  return mass;
};

/** One row per stored slot, in stored order; `portions` is the number the cook chose. */
export const slotRows = (nb: Notebook, dish: DishRecord, portions: number): SlotRow[] =>
  dish.slots.map((slot): SlotRow => {
    const known = slot.ref.kind === 'ingredient' || nb.components.some((c) => c.id === slot.ref.id);
    const row: SlotRow = {
      role: slot.role,
      roleLabel: roleLabel(slot.role),
      name: refName(nb, slot.ref),
      linked: slot.ref.kind === 'component' && known,
      ...slotMass(nb, dish, slot, portions),
    };
    if (!known) {
      row.problem = explain({ code: 'unknown-component', componentId: slot.ref.id }, nb);
      return row;
    }
    const grams = gramsOf(nb, slot);
    if (grams === 'needs-mass') row.problem = strings.notebook.problem.needsMass(row.name);
    else if (grams === 'cannot-convert')
      row.problem = strings.notebook.problem.cannotConvert(row.name);
    else if (grams === undefined && row.runs === undefined)
      row.problem = strings.dishes.noAmount(row.name);
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
