// A substitute effect: what replaces an ingredient and what changes, shipped read-only, one file per
// substitute in data/substitutes/. Reference knowledge: never stored, never fades with learning.
import type { I18nText } from '../text/i18n';
import type { TechniqueLevel, TechniqueSource } from '../techniques/types';

/** How well the statement is known; the same three levels as a technique. */
export type SubstituteLevel = TechniqueLevel;

/** What a statement rests on; the same shape as the source of a technique. */
export type SubstituteSource = TechniqueSource;

export interface Substitute {
  id: string;
  /** The ingredient or group (catalogue id) that is replaced. A group covers everything below it. */
  from: string;
  /** The ingredient or group (catalogue id) that replaces it. */
  to: string;
  /**
   * Amount of `to` per amount of `from`, in the same unit. Only where the source gives one; absent:
   * the amount is the line's own and `changes` says what the source says about amounts.
   */
  factor?: number;
  /** What changes (taste, texture, amount, handling), in one or two short sentences. */
  changes: I18nText;
  level: SubstituteLevel;
  sources: readonly SubstituteSource[];
}
