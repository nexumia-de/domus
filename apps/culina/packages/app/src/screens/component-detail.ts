// The detail of one component: lines, yield, scaling, portions and the raw list.
import { yieldView } from '../components/figures';
import { lineRows } from '../components/lines';
import { stepLines } from '../components/steps-view';
import { techniques } from '../classics/content';
import { currentLang } from '../classics/lang';
import { roleLabel } from '../components/names';
import { hashFor } from '../router';
import type { ComponentRecord, Notebook } from '../records';
import { el } from '../shell/el';
import { strings } from '../strings';
import { headOfFamily } from '../notebook';
import { cooklangAction } from './cooklang-action';
import { detailActions } from './detail-actions';
import { versionLines, versionSection } from './version-info';
import { linesSection } from './component-lines';
import { scaleSections } from './component-scale';
import { yieldSection } from './component-yield';

export const componentDetail = (nb: Notebook, component: ComponentRecord): HTMLElement => {
  const card = el('article', 'card component-card');
  const back = el('a', 'back-link', strings.components.back);
  back.href = hashFor('components');
  card.append(back, el('h1', undefined, component.name));
  if (component.role !== undefined) card.append(el('p', 'muted', roleLabel(component.role)));
  card.append(versionLines('components', component));
  if (headOfFamily('components', component.id)?.id === component.id) {
    card.append(detailActions('components', component.id, component.name));
  }
  card.append(cooklangAction(component), versionSection('components', component));

  const known = (id: string): boolean => nb.components.some((c) => c.id === id);
  const figures = yieldView(nb, component);
  const recordedG = figures.ok && figures.output.known ? figures.output.outputG : undefined;
  card.append(
    linesSection(lineRows(nb, component), known),
    yieldSection(figures),
    ...scaleSections(nb, component, recordedG),
  );
  const steps = stepLines(nb, component, currentLang(), techniques());
  if (steps.length > 0) {
    const section = el('section', 'steps-section');
    const list = el('ol', 'recipe-steps');
    for (const line of steps) list.append(el('li', undefined, line));
    const cook = el('a', 'btn primary', strings.components.cookSteps);
    cook.href = hashFor('components', component.id, 'cook');
    section.append(el('h2', undefined, strings.components.stepsHeading), list, cook);
    card.append(section);
  }
  if (component.method !== undefined) {
    const notes = el('section', 'notes-section');
    notes.append(el('h2', undefined, strings.components.notesHeading));
    for (const step of component.method) notes.append(el('p', undefined, step));
    card.append(notes);
  }
  return card;
};
