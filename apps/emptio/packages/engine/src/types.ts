// The entities of the data model (docs/data-model.md) as the rules read them.
import type { Priority } from './priority';

/** Why an entry is on the list. */
export type Origin =
  { kind: 'typed' } | { kind: 'recipe'; app: string; title: string } | { kind: 'staple' };

/** What is stored for an entry; the id is the key of its record. */
export interface EntryFields {
  name: string;
  ingredientId?: string;
  categoryId: string;
  priority: Priority;
  amount?: string;
  note?: string;
  addedAt: string;
  origins: Origin[];
  bought?: { at: string; storeId?: string };
  notAt?: string[];
}

export interface Entry extends EntryFields {
  id: string;
}

/** The category every list has and that cannot be hidden. */
export const OTHER_CATEGORY = 'other';
