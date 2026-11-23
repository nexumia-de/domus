// "What uses <ingredient>", #/cook/<id>/with: started from one ingredient on Cook (./start.ts), the
// finder's list of the own components and dishes that use it or something it can stand in for, in
// the engine's one ranking, each entry with its reason, and the finder's own two choices, role and
// how much may lack (`culina.cook`). The dish filter of Cook's list does not narrow it. The rest of
// the former finder screen went with docs/decisions/cook-screen.md: Cook is the one list
// (./cook-list.ts). No arithmetic here: statuses and numbers are the engine's.
import { loadNames } from '../../classics/names';
import { dishEntriesByKey } from '../../browse/entries';
import { shippedNow } from '../../cook/entries';
import { find } from '../../cook/finder';
import type { Found } from '../../cook/finder';
import { ingredientName } from '../../cook/lookup';
import { originOf } from '../../cook/one-list';
import type { AnyCandidate } from '../../cook/one-list';
import { cookToday, notebookSource } from '../../cook/source';
import { storeProblem } from '../../notebook';
import { browserStore, readCookFilters, writeCookFilters } from '../../prefs';
import type { CookFilters } from '../../prefs';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { emptyState, noNotebook, nothingTicked } from './empty';
import { cookEntry, rowOf } from './entry';
import { filterControls } from './filters';

const t = strings.cook;

type Ok = Extract<Found, { ok: true }>;

const group = (
  heading: string,
  className: string,
  label: string,
  list: readonly AnyCandidate[],
  found: Ok,
  dish: boolean,
): HTMLElement => {
  const section = el('section', `cook-group ${className}`);
  const mixed = new Set(list.map(originOf)).size > 1;
  const ul = el('ul', 'rows cook-list');
  ul.setAttribute('aria-label', label);
  ul.append(...list.map((c) => cookEntry(rowOf(c, found), dish, mixed)));
  section.append(el('h2', 'cook-group-heading', heading), ul);
  return section;
};

/** What the results area shows for a finding. */
export const resultsOf = (found: Ok): HTMLElement[] => {
  if (!found.hasStock) return [nothingTicked()];
  const out: HTMLElement[] = [];
  if (found.dishes.length > 0)
    out.push(group(t.dishesHeading, 'cook-dishes', t.listLabel, found.dishes, found, true));
  if (found.parts.length > 0)
    out.push(group(t.partsHeading, 'cook-parts', t.partsListLabel, found.parts, found, false));
  const notebookEmpty = !found.hasRecipes && found.within.length === 0;
  if (found.dishes.length + found.parts.length === 0) out.push(emptyState(found, notebookEmpty));
  else if (notebookEmpty) out.push(noNotebook());
  return out;
};

/** @param ingredientId - The ingredient of #/cook/<id>/with. */
export const cookScreen = (ingredientId?: string): HTMLElement => {
  const section = el('section', 'screen cook-screen');
  const source = notebookSource();
  const today = cookToday();
  const chosen =
    ingredientId === undefined ? undefined : source.ingredients.find((i) => i.id === ingredientId);
  const heading = el(
    'h1',
    undefined,
    chosen === undefined ? t.title : t.withHeading(ingredientName(chosen)),
  );
  section.append(heading);
  const problem = storeProblem();
  if (problem !== undefined) {
    section.append(el('p', 'note-quiet', storeText(problem)));
    return section;
  }
  section.append(el('p', 'muted cook-asof', t.asOf(today)));
  const clear = el('a', 'btn quiet new-link', t.withClear);
  clear.href = hashFor('cook');
  section.append(el('p', 'muted', chosen === undefined ? t.withUnknown : t.withNote), clear);

  const store = browserStore();
  let filters: CookFilters = readCookFilters(store);
  const results = el('div', 'cook-results');
  const controls = filterControls(filters, (next) => {
    filters = next;
    writeCookFilters(store, next);
    draw();
  });
  function draw(): void {
    if (ingredientId === undefined || chosen === undefined) return results.replaceChildren();
    const found = find(source, today, filters, {
      entries: dishEntriesByKey(),
      ingredientId,
      shipped: shippedNow(),
    });
    if (!found.ok) {
      results.replaceChildren(el('p', 'note-quiet', t.problem));
      return;
    }
    controls.setRoles(found.roles);
    results.replaceChildren(...resultsOf(found));
  }
  draw();
  // The catalogue completes the ingredient tree; draw again once it is there.
  void loadNames().then(() => {
    // Left already: nothing to draw.
    if (!section.isConnected && section.parentNode === null) return;
    draw();
  });

  const choices = el('div', 'cook-choices');
  choices.append(controls.element);
  section.append(choices, results);
  return section;
};
