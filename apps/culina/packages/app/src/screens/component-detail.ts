// The detail of one component: lines, yield, scaling, portions and the raw list.
import { yieldView } from '../components/figures';
import { lineRows } from '../components/lines';
import { roleLabel } from '../components/names';
import { hashFor } from '../router';
import type { ComponentRecord, Notebook } from '../records';
import { el } from '../shell/el';
import { strings } from '../strings';
import { linesSection } from './component-lines';
import { scaleSections } from './component-scale';
import { yieldSection } from './component-yield';

export const componentDetail = (nb: Notebook, component: ComponentRecord): HTMLElement => {
  const card = el('article', 'card component-card');
  const back = el('a', 'back-link', strings.components.back);
  back.href = hashFor('components');
  card.append(back, el('h1', undefined, component.name));
  if (component.role !== undefined) card.append(el('p', 'muted', roleLabel(component.role)));

  const known = (id: string): boolean => nb.components.some((c) => c.id === id);
  const figures = yieldView(nb, component);
  const recordedG = figures.ok && figures.output.known ? figures.output.outputG : undefined;
  card.append(
    linesSection(lineRows(nb, component), known),
    yieldSection(figures),
    ...scaleSections(nb, component, recordedG),
  );
  return card;
};
