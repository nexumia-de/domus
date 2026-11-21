// "What can I cook": one list of what the stock allows, own and shipped dishes together in the
// engine's one ranking, then the own components and ratio cards; each entry with its reason. On
// top the one dish filter (shared with the Dishes list, `culina.dishes`) and the finder's own two
// choices, role and how much may lack (`culina.cook`). A start from one ingredient at
// #/cook/<id>/with. No arithmetic here: statuses and numbers are the engine's.
import { offeredBy, readDishFilter, writeDishFilter } from '../../browse/filter';
import type { DishFilter } from '../../browse/filter';
import { CHARACTER_TABLE } from '../../characters/table';
import { loadNames } from '../../classics/names';
import { dishEntries, dishEntriesByKey } from '../../browse/entries';
import { shippedNow } from '../../cook/entries';
import { find } from '../../cook/finder';
import type { Found } from '../../cook/finder';
import { isDish, originOf, partsInView } from '../../cook/one-list';
import type { AnyCandidate } from '../../cook/one-list';
import { cookToday, notebookSource } from '../../cook/source';
import { listIngredients, storeProblem } from '../../notebook';
import { COUNTRIES } from '../../classics/list-view';
import { browserStore, readCookFilters, writeCookFilters } from '../../prefs';
import type { CookFilters } from '../../prefs';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { COURSE_ORDER, dishFilterControls, replaceFilterControls } from '../dish-filter';
import { storeText } from '../editor/store-text';
import { emptyState, noNotebook, nothingTicked } from './empty';
import { cookEntry, rowOf } from './entry';
import { filterControls } from './filters';
import { startSection } from './start';
import { cookTabs } from './tabs';

const t = strings.cook;

type Ok = Extract<Found, { ok: true }>;

/** The order in which the dish filter offers its values. */
export const FILTER_ORDER = {
  characters: CHARACTER_TABLE.map((e) => e.id),
  courses: COURSE_ORDER,
  cuisines: COUNTRIES,
};

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

/**
 * What the results area shows for a finding.
 * @param showAll - Empties the dish filter; offered where it hides everything.
 */
export const resultsOf = (found: Ok, filter: DishFilter, showAll: () => void): HTMLElement[] => {
  if (!found.hasStock) return [nothingTicked()];
  const out: HTMLElement[] = [];
  if (found.dishes.length > 0)
    out.push(group(t.dishesHeading, 'cook-dishes', t.listLabel, found.dishes, found, true));
  if (found.parts.length > 0)
    out.push(group(t.partsHeading, 'cook-parts', t.partsListLabel, found.parts, found, false));
  if (!partsInView(filter) && found.within.some((c) => !isDish(c)))
    out.push(el('p', 'muted cook-parts-hidden', t.partsHidden));
  const notebookEmpty = !found.hasRecipes && found.within.length === 0;
  if (found.dishes.length + found.parts.length === 0)
    out.push(emptyState(found, notebookEmpty, filter, showAll));
  else if (notebookEmpty) out.push(noNotebook());
  return out;
};

/** @param ingredientId - Set on #/cook/<id>/with: only own records that use that ingredient. */
export const cookScreen = (ingredientId?: string): HTMLElement => {
  const section = el('section', 'screen cook-screen');
  const source = notebookSource();
  const today = cookToday();
  const chosen =
    ingredientId === undefined ? undefined : source.ingredients.find((i) => i.id === ingredientId);
  const heading = el(
    'h1',
    undefined,
    chosen === undefined ? t.tabCook : t.withHeading(chosen.name),
  );
  section.append(heading, cookTabs('cook'));
  const problem = storeProblem();
  if (problem !== undefined) {
    section.append(el('p', 'note-quiet', storeText(problem)));
    return section;
  }
  section.append(el('p', 'muted cook-asof', t.asOf(today)));
  if (ingredientId !== undefined) {
    const clear = el('a', 'btn quiet new-link', t.withClear);
    clear.href = hashFor('cook');
    section.append(el('p', 'muted', chosen === undefined ? t.withUnknown : t.withNote), clear);
  } else section.append(el('p', 'muted', t.intro));

  const store = browserStore();
  let filters: CookFilters = readCookFilters(store);
  let dishFilter: DishFilter = readDishFilter(store);
  // "What uses <ingredient>" answers that question alone: the dish filter chosen elsewhere does
  // not narrow it, and its controls are not shown there (the finder's own two choices are).
  const usesView = ingredientId !== undefined;
  const narrowing = (): DishFilter => (usesView ? {} : dishFilter);
  const setDishFilter = (next: DishFilter): void => {
    dishFilter = next;
    writeDishFilter(store, dishFilter);
    drawFilter();
    draw();
  };
  const results = el('div', 'cook-results');
  const filterSlot = el('div', 'cook-dish-filter');
  const controls = filterControls(filters, (next) => {
    filters = next;
    writeCookFilters(store, next);
    draw();
  });
  function drawFilter(): void {
    if (usesView) return;
    replaceFilterControls(
      filterSlot,
      dishFilterControls(dishFilter, offeredBy(dishEntries(), FILTER_ORDER), setDishFilter),
    );
  }
  function draw(): void {
    if (ingredientId !== undefined && chosen === undefined) return results.replaceChildren();
    const found = find(source, today, filters, {
      filter: narrowing(),
      entries: dishEntriesByKey(),
      ...(ingredientId === undefined ? {} : { ingredientId }),
      shipped: shippedNow(),
    });
    if (!found.ok) {
      results.replaceChildren(el('p', 'note-quiet', t.problem));
      return;
    }
    controls.setRoles(found.roles);
    results.replaceChildren(...resultsOf(found, narrowing(), () => setDishFilter({})));
  }
  drawFilter();
  draw();
  // The catalogue completes the tree for the shipped dishes and the characters of every dish;
  // draw again once it is there.
  void loadNames().then(() => {
    // Left already: nothing to draw.
    if (!section.isConnected && section.parentNode === null) return;
    drawFilter();
    draw();
  });

  const ticked = new Set(
    source.stock.filter((s) => s.ref.kind === 'ingredient').map((s) => s.ref.id),
  );
  const choices = el('div', 'cook-choices');
  if (usesView) choices.append(controls.element);
  else choices.append(filterSlot, controls.element);
  section.append(choices, startSection(listIngredients(), ticked, false), results);
  return section;
};
