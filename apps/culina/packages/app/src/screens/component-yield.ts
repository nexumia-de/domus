// The yield section of a component: input, output, loss and yield percent, or the neutral
// "Output not weighed yet".
import type { YieldView } from '../components/figures';
import { formatMass, formatNumber } from '../shared/mass';
import { el } from '../shell/el';
import { strings } from '../strings';

const figure = (term: string, value: string): HTMLElement[] => {
  const group = el('div', 'figure');
  group.append(el('dt', undefined, term), el('dd', 'num', value));
  return [group];
};

export const yieldSection = (view: YieldView): HTMLElement => {
  const section = el('section', 'yield');
  section.append(el('h2', undefined, strings.components.yieldHeading));
  if (!view.ok) {
    section.append(el('p', 'note-quiet', view.message));
    return section;
  }
  const list = el('dl', 'figures');
  list.append(...figure(strings.components.inputLabel, formatMass(view.inputG, 'g')));
  const out = view.output;
  if (!out.known) {
    section.append(list, el('p', 'unweighed', strings.components.outputUnknown));
    section.append(el('p', 'muted', strings.components.outputUnknownHelp));
  } else {
    const gain = out.lossG < 0;
    list.append(
      ...figure(strings.components.outputLabel, formatMass(out.outputG, 'g')),
      ...figure(
        gain ? strings.components.gainLabel : strings.components.lossLabel,
        formatMass(Math.abs(out.lossG), 'g'),
      ),
      ...figure(strings.components.yieldLabel, `${formatNumber(out.yieldPct, 1)} %`),
    );
    section.append(list, el('p', 'muted', strings.components.outputSource(out.source)));
  }
  if (view.partial) section.append(el('p', 'muted', strings.components.inputPartial));
  return section;
};
