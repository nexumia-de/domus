// A handling rule: when an ingredient goes into a dish and how it is treated, with the reason. It
// hangs on one catalogue ingredient or on a group (so it applies to everything under the group) and
// on one technique, so that it fades when the user marks that skill as learned. Shipped read-only,
// one file per rule in data/handling/. Never stored.
import type { I18nText } from '../text/i18n';
import type { TechniqueLevel, TechniqueSource } from '../techniques/types';

/** How well the statement is known; the same three levels as a technique. */
export type HandlingLevel = TechniqueLevel;

/** What a rule rests on; the same shape as a technique's source. */
export type HandlingSource = TechniqueSource;

export interface HandlingRule {
  id: string;
  /** A catalogue ingredient id, or a group id: the rule then applies to every ingredient under it. */
  target: string;
  /** The rule in one or two short sentences: when it goes in, how it is treated. */
  text: I18nText;
  /** Why. */
  why: I18nText;
  /** The skill the rule belongs to; the rule is not shown once that technique is learned. */
  technique: string;
  level: HandlingLevel;
  sources: readonly HandlingSource[];
}
