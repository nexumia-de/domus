// A technique: a kitchen skill with its short note, shipped read-only, one file per technique in
// data/techniques/. Never stored; whether the user learned it is a skill record.
import type { I18nText } from '../text/i18n';

/** How well the statement is known: studied, from a textbook, or kitchen tradition. */
export type TechniqueLevel = 'studied' | 'textbook' | 'tradition';

/** What a statement rests on: the work, the place in it, the URL and the sentence read. */
export interface TechniqueSource {
  title: string;
  place: string;
  url: string;
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
