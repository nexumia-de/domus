// A technique: a kitchen skill with its short note, shipped read-only, one file per technique in
// data/techniques/. Never stored; whether the user learned it is a skill record.
import type { I18nText } from '../text/i18n';

/**
 * How a statement is known, the one list for notes, handling rules and substitutes (the schemas carry
 * the same five words, a test keeps them equal):
 * - `studied`: a study measured it;
 * - `textbook`: a textbook states it;
 * - `tested`: the author ran an experiment and reports it (a tested-kitchen book);
 * - `authority`: an official body states it (food safety);
 * - `tradition`: kitchens' sources state it, no study.
 */
export const TECHNIQUE_LEVELS = [
  'studied',
  'textbook',
  'tested',
  'authority',
  'tradition',
] as const;
export type TechniqueLevel = (typeof TECHNIQUE_LEVELS)[number];

/** What a statement rests on: the work, the place in it, the URL and the sentence read. */
export interface TechniqueSource {
  title: string;
  place: string;
  url: string;
  /** SPDX identifier of the work's licence, for example `CC-BY-NC-SA-4.0`. */
  licence?: string;
  /** The sentence the note rests on, at most 25 words, for the reviewer. */
  sentence: string;
}

export interface Technique {
  id: string;
  name: I18nText;
  /** The short note shown beside a step: what to watch. */
  watch: I18nText;
  /** Why it matters. */
  why: I18nText;
  level: TechniqueLevel;
  sources: readonly TechniqueSource[];
}
