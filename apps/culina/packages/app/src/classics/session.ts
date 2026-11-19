// What the cook chose on the dish screen and keeps while moving between its screens: the portions
// of each dish, and the step of the dish being cooked. In memory only; a new visit starts again.
import { DEFAULT_PORTIONS } from '@culina/engine';

const portions = new Map<string, number>();

export const portionsOf = (id: string): number => portions.get(id) ?? DEFAULT_PORTIONS;
export const setPortions = (id: string, value: number): void => {
  portions.set(id, value);
};

const steps = new Map<string, number>();

/** The step the cook is at, counted from 0; the number of steps means "done". */
export const stepOf = (id: string): number => steps.get(id) ?? 0;
export const setStep = (id: string, step: number): void => {
  steps.set(id, step);
};
