// What else could fill a slot: the notebook's components whose role is the slot's. Nothing of this
// is stored: the candidates are read from the components, and a swap is a dish record made for
// the moment, with another filling in a slot and everything else as it is stored. Pure: no DOM.
import type { DishRecord, Notebook, SlotRecord } from '../records';

export interface Candidate {
  /** The id a slot refers to: the family's, so the slot follows the current version. */
  id: string;
  name: string;
  role: string;
}

/** Slot index to the id of the component that fills it for now. */
export type Swaps = ReadonlyMap<number, string>;

export interface Swapped {
  index: number;
  /** The name of the stored filling. */
  from: string;
  /** The name of the filling for now. */
  to: string;
}

const familyOf = (nb: Notebook, id: string): string | undefined =>
  nb.components.find((c) => c.id === id)?.version.family;

/**
 * The components that name a role, each family once (the notebook holds every version id, all
 * with the content of the current version), by name.
 */
export const roleCandidates = (nb: Notebook): Candidate[] => {
  const ids = new Set(nb.components.map((c) => c.id));
  const byFamily = new Map<string, Candidate>();
  for (const c of nb.components) {
    const family = c.version.family;
    if (c.role === undefined || c.role === '' || byFamily.has(family)) continue;
    byFamily.set(family, { id: ids.has(family) ? family : c.id, name: c.name, role: c.role });
  }
  return [...byFamily.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
};

/**
 * The alternatives of a slot: the components of the slot's role other than the one that fills
 * it. A slot filled by an ingredient has none.
 */
export const alternativesFor = (nb: Notebook, slot: SlotRecord): Candidate[] => {
  if (slot.ref.kind !== 'component') return [];
  const current = familyOf(nb, slot.ref.id) ?? slot.ref.id;
  return roleCandidates(nb).filter(
    (c) => c.role === slot.role && (familyOf(nb, c.id) ?? c.id) !== current,
  );
};

/**
 * The dish with the swaps applied: the slot keeps its role, amount and key, only the filling
 * changes. A swap is left out when its slot is not filled by a component, when the component is
 * not in the notebook, or when it is the stored filling. Without a swap the dish itself comes back.
 */
export const withSwaps = (
  nb: Notebook,
  dish: DishRecord,
  swaps: Swaps,
): { dish: DishRecord; swapped: Swapped[] } => {
  const swapped: Swapped[] = [];
  const slots = dish.slots.map((slot, index): SlotRecord => {
    const id = swaps.get(index);
    if (id === undefined || slot.ref.kind !== 'component') return slot;
    const to = nb.components.find((c) => c.id === id);
    if (to === undefined) return slot;
    const from = nb.components.find((c) => c.id === slot.ref.id);
    if (from?.version.family === to.version.family) return slot;
    swapped.push({ index, from: from?.name ?? slot.ref.id, to: to.name });
    return { ...slot, ref: { kind: 'component', id } };
  });
  return swapped.length === 0 ? { dish, swapped } : { dish: { ...dish, slots }, swapped };
};
