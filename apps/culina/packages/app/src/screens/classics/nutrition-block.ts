// "Nutrition per portion" on the dish screen, closed behind a tap like the source: the rounded
// figures for the chosen portions and where the data comes from; with too few counted ingredients one
// short line instead. What was left out and how it is rounded is behind a second tap. It never judges.
import type { Classic } from '@culina/engine';
import { nutritionView, type Lookup } from '../../classics/nutrition-view';
import { currentLang } from '../../classics/lang';
import { catalogueEntries, ingredientLabel } from '../../classics/names';
import { getIngredient } from '../../notebook';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.nutrition;

const lookup: Lookup = (id) => getIngredient(id) ?? catalogueEntries().get(id);

/** The closed section and the function that draws it again for other portions. */
export const nutritionDetails = (
  classic: Classic,
): { element: HTMLDetailsElement; draw: (portions: number) => void } => {
  const element = el('details', 'nutrition-block foot-block');
  const draw = (portions: number): void => {
    const lang = currentLang();
    const shown = nutritionView(classic, portions, lang, (id) => ingredientLabel(id, lang), lookup);
    const body: HTMLElement[] = [];
    if (shown.ok) {
      const { view } = shown;
      if (view.tooFew) body.push(el('p', undefined, t.tooFew));
      else {
        body.push(el('p', 'muted', t.portionsLine(view.portions)));
        const list = el('dl', 'nutrition-list');
        list.setAttribute('aria-label', t.tableLabel);
        for (const row of view.rows) {
          list.append(el('dt', undefined, row.label), el('dd', 'num', row.value));
        }
        body.push(list);
        for (const note of view.notShown) body.push(el('p', 'muted', note));
        body.push(el('p', undefined, view.coverage));
        body.push(el('p', 'muted', t.source), el('p', 'muted', t.notALabel));
      }
      // What was left out, how it is counted and rounded: one tap away, not in the way.
      const more = el('details', 'nutrition-more note-more');
      more.append(el('summary', undefined, t.moreSummary));
      if (view.tooFew) more.append(el('p', undefined, view.coverage));
      if (view.notCounted !== undefined) more.append(el('p', 'muted', view.notCounted));
      if (view.massShare !== undefined) more.append(el('p', 'muted', view.massShare));
      more.append(el('p', 'muted', t.method), el('p', 'muted', t.rounding));
      if (view.tooFew) more.append(el('p', 'muted', t.source), el('p', 'muted', t.notALabel));
      body.push(more);
    }
    element.replaceChildren(el('summary', undefined, t.heading), ...body);
  };
  draw(1);
  return { element, draw };
};
