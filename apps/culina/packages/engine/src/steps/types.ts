// A step of a method. A stored component's `steps` and a classic's steps are the same shape; a
// classic's step always has its text.
import type { I18nText } from '../text/i18n';

/** Time as the source gives it: `value`, or a range from `value` to `to`. */
export interface StepTime {
  value: number;
  to?: number;
  unit: 's' | 'min' | 'h';
}

/** Temperature as the source gives it: `value`, or a range from `value` to `to`. */
export interface StepTemperature {
  value: number;
  to?: number;
  unit: 'C' | 'F';
}

/**
 * One step. What is done is said by a bilingual `text` (the shipped dishes and their copies), by the
 * `technique` it teaches, by a plain `action`, or by a `note` in the user's own words; at least one
 * of the four, and a technique or an action, not both.
 */
export interface Step {
  text?: I18nText;
  technique?: string;
  /** A plain action of the shipped list: it names the step and teaches nothing. */
  action?: string;
  uses?: readonly string[];
  time?: StepTime;
  temperature?: StepTemperature;
  /** The user's own remark, in one language. */
  note?: string;
  /** A remark about the source for this step (a time that is not legible); shown only in the dish's source section. */
  sourceNote?: I18nText;
}

/** A step of a shipped dish, and of its copy: it always has its text in both languages. */
export type TextStep = Step & { text: I18nText };

/** What a step is called by: its technique or its plain action. */
export type StepWord = { kind: 'technique'; id: string } | { kind: 'action'; id: string };

/**
 * The word a step is called by.
 *
 * @param step - A step.
 * @returns Its technique, else its action, else `undefined` (a step of text or note alone).
 */
export function stepWord(step: Step): StepWord | undefined {
  if (step.technique !== undefined) return { kind: 'technique', id: step.technique };
  if (step.action !== undefined) return { kind: 'action', id: step.action };
  return undefined;
}
