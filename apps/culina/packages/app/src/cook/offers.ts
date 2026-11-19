// What is there for a role: the names of the stock items whose ingredient or component has the
// role, from the engine's `stockForRole`. An open role of a dish is offered only where this is
// not empty.
import { stockForRole } from '@culina/engine';
import type { MakeableInput } from '@culina/engine';
import type { Lookup } from './lookup';

/** The names in stock for a role, earliest use-by first, each once; none when the input is unusable. */
export const offersFor =
  (input: MakeableInput, look: Lookup) =>
  (role: string): string[] => {
    const items = stockForRole(input, role);
    if (!items.ok) return [];
    const names = items.items.map((i) => {
      const ref = look.itemRef(i.itemId);
      return ref === undefined ? i.ingredientId : look.name(ref);
    });
    return [...new Set(names)];
  };
