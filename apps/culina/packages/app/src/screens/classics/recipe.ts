// The whole recipe as text: the ingredient lines per component, what goes with them, and the
// method. Shown on the dish screen and, one tap away, on the step-by-step screen.
import type { ComponentView, LineView } from '../../classics/dish-view';
import type { StepView } from '../../classics/cook-view';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import type { LineExtra } from './substitute-block';

const t = strings.classics;

export const lineItem = (line: LineView, extra?: LineExtra): HTMLElement => {
  const written = line.amount ?? line.amountWord;
  // A line without an amount shows its name alone: nothing is made up for it.
  const item = el('li', written === undefined ? 'recipe-line recipe-line-bare' : 'recipe-line');
  const name = el('span', 'recipe-name', line.name);
  if (written === undefined) item.append(name);
  else item.append(el('span', 'recipe-amount num', written), name);
  const extras = [
    line.note,
    line.optional ? t.optional : undefined,
    line.settled ? t.settledMark : undefined,
  ].filter((x): x is string => x !== undefined);
  if (extras.length > 0) item.append(el('span', 'recipe-extra muted', extras.join(' · ')));
  if (extra !== undefined) item.append(...extra(line));
  return item;
};

export const lineList = (
  lines: readonly LineView[],
  label: string,
  extra?: LineExtra,
): HTMLElement => {
  const list = el('ul', 'recipe-lines');
  list.setAttribute('aria-label', label);
  list.append(...lines.map((line) => lineItem(line, extra)));
  return list;
};

/** The ingredients: a heading per component and one for the dish's own slots. */
export const ingredientsBlock = (
  components: readonly ComponentView[],
  slots: readonly LineView[],
  extra?: LineExtra,
): HTMLElement => {
  const block = el('section', 'recipe-block');
  block.append(el('h2', undefined, t.ingredientsHeading));
  for (const c of components) {
    if (c.lines.length === 0) continue;
    block.append(el('h3', undefined, c.name), lineList(c.lines, c.name, extra));
  }
  if (slots.length > 0)
    block.append(el('h3', undefined, t.dishHeading), lineList(slots, t.dishHeading, extra));
  return block;
};

/** The method: the steps in order, grouped under the component they belong to. */
export const methodBlock = (steps: readonly StepView[]): HTMLElement | undefined => {
  if (steps.length === 0) return undefined;
  const block = el('section', 'recipe-block');
  block.append(el('h2', undefined, t.stepsHeading));
  let list: HTMLOListElement | undefined;
  let last: string | undefined;
  for (const step of steps) {
    if (list === undefined || step.component !== last) {
      block.append(el('h3', undefined, step.component));
      list = el('ol', 'recipe-steps');
      list.start = step.number;
      block.append(list);
      last = step.component;
    }
    const extras = [step.time, step.temperature].filter((x): x is string => x !== undefined);
    list.append(el('li', undefined, [step.text, ...extras].join(' · ')));
  }
  return block;
};
