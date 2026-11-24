// A set of choices folded behind one line (a native <details>: a button for assistive
// technology, opened with Enter or Space): the summary names what is inside and, in the quiet
// colour, what is chosen, so a closed fold still says what narrows. Used by the random pick and
// the dish editor's "What it is like"; Cook's list has its own (dish-list.ts) with the same look.
import { el } from '../shell/el';

export interface Fold {
  element: HTMLDetailsElement;
  /** Where the folded choices go. */
  body: HTMLElement;
  /** Sets the quiet text of the summary: what is chosen. */
  setChoices(text: string): void;
}

export const fold = (
  className: string,
  name: string,
  open: boolean,
  onToggle: (open: boolean) => void = () => undefined,
): Fold => {
  const element = el('details', `fold ${className}`);
  element.open = open;
  element.addEventListener('toggle', () => onToggle(element.open));
  const summary = el('summary', 'fold-summary');
  const choices = el('span', 'fold-choices');
  summary.append(el('span', 'fold-name', name), choices);
  const body = el('div', 'fold-body');
  element.append(summary, body);
  return {
    element,
    body,
    setChoices: (text) => {
      choices.textContent = text;
    },
  };
};
