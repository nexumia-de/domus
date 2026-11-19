// The editor's working copy of a drink: what the user typed, before it is
// checked and turned into a spec. Plain JSON, so it can be kept as a draft.

import type { Role, SpecLine } from '../browse/types';

/** A substitute the author names for a line: the ingredient and an optional own amount. */
export interface DraftSubstitute {
  ingredientId: string;
  /** Empty: no amount of its own. */
  amountText: string;
  /** The stored substitute this one started from; kept while the amount text is unchanged. */
  original?: { amount: number; unit: string };
  originalText?: string;
}

export interface DraftLine {
  /** Stable within the draft: focus, reorder and the line menu name it. */
  key: string;
  /** Empty for a slot from a template that has no ingredient yet. */
  ingredientId: string;
  /** The amount as typed, with or without a unit. */
  amountText: string;
  /** The unit selector: the unit of a bare number, or `top`; empty when none is chosen. */
  unit: string;
  /** A role set by the user or a template slot; absent means the ingredient's own. */
  role?: Role;
  optional: boolean;
  note: string;
  /** The volume of a `top` line as typed. */
  topText: string;
  /** Accepted substitutes (what the engine calls listed substitutes); absent when there are none. */
  substitutes?: DraftSubstitute[];
  /** The stored line this one started from; kept while the amount text is unchanged. */
  original?: SpecLine;
  originalText?: string;
}

export type Target =
  | { kind: 'new' }
  | { kind: 'edit'; id: string; lineageId: string; version: number }
  /**
   * A new drink made from another: the user's copy of a built-in drink (Edit)
   * or a riff on any drink (`riff`); `fromId` is the spec it names as its parent.
   */
  | { kind: 'copy'; fromId: string; fromName: string; riff?: boolean; variantName?: string };

export interface DraftPrepared {
  on: boolean;
  yieldText: string;
  shelfText: string;
  /** How to keep it, free text; empty for none. */
  storageText: string;
  /** Where the prepared ingredient belongs in the tree; empty for nowhere. */
  parentId: string;
  role: '' | Role;
  /** The ingredient record that already exists for this spec, if any. */
  ingredientId: string;
}

/** Fields of the stored spec the editor has no control for; they travel with the draft unchanged. */
export interface Kept {
  tags?: string[];
  source?: { name: string; licence: string; url?: string; note?: string };
  createdAt?: string;
  parentId?: string;
}

export interface Draft {
  target: Target;
  name: string;
  /** Empty: none chosen, the engine may suggest one. */
  templateId: string;
  lines: DraftLine[];
  method: string;
  glass: string;
  garnish: string;
  notes: string;
  status: 'draft' | 'on-menu' | 'retired';
  prepared: DraftPrepared;
  keep: Kept;
  nextKey: number;
}
