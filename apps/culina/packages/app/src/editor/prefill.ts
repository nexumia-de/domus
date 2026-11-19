// "Make a recipe from this ratio": the ratio card hands the calculator's amounts to the new
// component editor. In memory only; the editor keeps what it takes as its draft at once.
import { displayStep, roundMass } from '@culina/engine';
import { appLang, withDecimalMark } from '../shared/locale';
import type { ComponentForm } from './component-form';
import { newComponentForm } from './component-form';

export interface Prefill {
  templateId: string;
  /** The template's anchor role, if it has one: that role's lines are the reference. */
  baseRole?: string;
  /** Grams per role as the calculator shows them; absent where nothing was entered yet. */
  lines: { role: string; g?: number }[];
}

let pending: Prefill | undefined;

export const setPrefill = (prefill: Prefill): void => {
  pending = prefill;
};

/** The waiting prefill, once. */
export const takePrefill = (): Prefill | undefined => {
  const taken = pending;
  pending = undefined;
  return taken;
};

/** Grams as the calculator displays them: the engine's display step. */
const shown = (g: number): string => {
  const rounded = roundMass(g, displayStep(g));
  return withDecimalMark(String(rounded.ok ? rounded.g : g), appLang);
};

/** A new component form with one line per role; the ingredient of each is still to be picked. */
export const formFromPrefill = (prefill: Prefill, id: string): ComponentForm => ({
  ...newComponentForm(id),
  templateId: prefill.templateId,
  ...(prefill.baseRole === undefined ? {} : { percentBase: prefill.baseRole }),
  lines: prefill.lines.map((line) => ({
    role: line.role,
    amount: line.g === undefined ? '' : shown(line.g),
    unit: 'g' as const,
  })),
});
