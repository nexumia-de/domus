// A step of a method. A stored component's `steps` and a classic's steps are the same shape.
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

/** One step: text in both languages, the technique it teaches, the lines it uses by line key. */
export interface Step {
  text: I18nText;
  technique?: string;
  uses?: readonly string[];
  time?: StepTime;
  temperature?: StepTemperature;
  /** A remark about the source for this step (a time that is not legible); shown only in the dish's source section. */
  sourceNote?: I18nText;
}
