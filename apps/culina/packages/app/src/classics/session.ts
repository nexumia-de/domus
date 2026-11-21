// What the cook chose on the dish screen and keeps while moving between its screens: the portions
// of each dish (shipped or own; the cook screen reads them), and the step of the dish being
// cooked. In memory only; a reload starts again.
import { DEFAULT_PORTIONS } from '@culina/engine';

const portions = new Map<string, number>();

/** The portions chosen for a dish; before any choice `fallback` (by default the engine's 2). */
export const portionsOf = (id: string, fallback: number = DEFAULT_PORTIONS): number =>
  portions.get(id) ?? fallback;
export const setPortions = (id: string, value: number): void => {
  portions.set(id, value);
};

const steps = new Map<string, number>();

/** The step the cook is at, counted from 0; the number of steps means "done". */
export const stepOf = (id: string): number => steps.get(id) ?? 0;
export const setStep = (id: string, step: number): void => {
  steps.set(id, step);
};
