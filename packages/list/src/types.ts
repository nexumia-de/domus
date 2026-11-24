// The entry of the list (docs/entry.md) as the rules read it.
import type { Priority } from './priority';

/**
 * Why an entry is on the list. A recipe origin may name its `dish` (since 2026-11-24): what the
 * dish is in the app that handed it over, the same in every language. Readers that do not know
 * the field keep it and show the title (docs/entry.md#origins).
 */
export type Origin =
  | { kind: 'typed' }
  | { kind: 'recipe'; app: string; title: string; dish?: string }
  | { kind: 'staple' };

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
