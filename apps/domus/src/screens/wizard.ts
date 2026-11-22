// A wizard: one decision per step, "Step n of m", and Back always possible. The trail of steps
// is kept here; what a step shows is the screen's.
import { h } from '../dom';
import type { Strings } from '../strings';
import { button } from './parts';

export interface Wizard<Step extends string> {
  /** Shows a step; `back` returns to it instead of adding to the trail. */
  goTo: (step: Step, back?: boolean) => void;
  /** The step before, or `leave` on the first one. */
  goBack: () => void;
  /** "Step n of m" and the step's heading. */
  header: (heading: string) => HTMLElement[];
  backButton: () => HTMLButtonElement;
  draw: () => void;
}

/**
 * @param numbers The number each step shows; steps that are one decision share a number.
 * @param steps What each step draws into `body`. Read when a step is drawn, so it may be filled
 *   after the wizard is made.
 * @param leave Where Back goes from the first step.
 */
export function createWizard<Step extends string>(options: {
  t: Strings;
  body: HTMLElement;
  first: Step;
  numbers: Record<Step, number>;
  total: number;
  steps: () => Record<Step, () => HTMLElement[]>;
  leave: () => void;
}): Wizard<Step> {
  const { t, body, numbers, total } = options;
  let current = options.first;
  const trail: Step[] = [];
  const draw = (): void => {
    // The inputs of a step (a token) are gone from the page as soon as the step is left.
    body.replaceChildren(...options.steps()[current]());
  };
  const goTo = (step: Step, back = false): void => {
    if (back) trail.pop();
    else trail.push(current);
    current = step;
    draw();
    body.querySelector<HTMLElement>('h2')?.focus();
  };
  const goBack = (): void => {
    const previous = trail[trail.length - 1];
    if (previous === undefined) options.leave();
    else goTo(previous, true);
  };
  return {
    goTo,
    goBack,
    draw,
    header: (heading) => [
      h(
        'p',
        { class: 'step-of', 'data-testid': 'step-of' },
        t.create.stepOf(numbers[current], total),
      ),
      h('h2', { tabindex: '-1', 'data-testid': 'step-heading' }, heading),
    ],
    backButton: () => button(t.common.back, goBack, { quiet: true, testid: 'back' }),
  };
}
