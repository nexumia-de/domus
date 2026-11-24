// The ingredients of a dish while it is put together in the editor, as the pairing view needs
// them: a slot filled by an ingredient is one line; a slot filled by a component gives the
// ingredients of that component, through the components its lines name. Each ingredient once,
// in the order met. Pure: no DOM, no store.
import type { PairingLine } from './view';

interface Ref {
  kind: 'ingredient' | 'component';
  id: string;
}

export interface DraftSlot {
  /** Undefined while the filling is still to be chosen. */
  ref?: Ref;
}

export interface DraftComponent {
  id: string;
  lines: readonly { ref: Ref }[];
}

/** The lines of the draft's slots; a component that is not there, or names itself, gives none. */
export function draftLines(
  slots: readonly DraftSlot[],
  components: readonly DraftComponent[],
  nameOf: (ingredient: string) => string,
): PairingLine[] {
  const byId = new Map(components.map((c) => [c.id, c]));
  const out = new Map<string, PairingLine>();
  const walked = new Set<string>();
  const take = (ref: Ref): void => {
    if (ref.kind === 'ingredient') {
      if (!out.has(ref.id)) out.set(ref.id, { ingredient: ref.id, name: nameOf(ref.id) });
      return;
    }
    if (walked.has(ref.id)) return;
    walked.add(ref.id);
    for (const line of byId.get(ref.id)?.lines ?? []) take(line.ref);
  };
  for (const slot of slots) if (slot.ref !== undefined) take(slot.ref);
  return [...out.values()];
}
