// "What can I cook": the stock against the notebook, in the engine's order, each entry with its
// reason; filters by role and by how much may lack (kept in the preferences); a start from one
// ingredient at #/cook/<id>/with. No arithmetic here: statuses and numbers are the engine's.
import { cookToday, notebookSource } from '../../cook/source';
import { find } from '../../cook/finder';
import type { Found } from '../../cook/finder';
import { cookRow } from '../../cook/rows';
import { listIngredients, storeProblem } from '../../notebook';
import { browserStore, readCookFilters, writeCookFilters } from '../../prefs';
import type { CookFilters } from '../../prefs';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { emptyState } from './empty';
import { cookEntry } from './entry';
import { filterControls } from './filters';
import { startSection } from './start';
import { cookTabs } from './tabs';

const t = strings.cook;

type Ok = Extract<Found, { ok: true }>;

const list = (found: Ok): HTMLElement => {
  const rows = found.shown.map((c) => cookRow(c, found.look, found.offers));
  const ul = el('ul', 'rows cook-list');
  ul.setAttribute('aria-label', t.listLabel);
  ul.append(...rows.map(cookEntry));
  return ul;
};

/** @param ingredientId - Set on #/cook/<id>/with: only what uses that ingredient. */
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

  let filters: CookFilters = readCookFilters(browserStore());
  const results = el('div', 'cook-results');
  const controls = filterControls(filters, (next) => {
    filters = next;
    writeCookFilters(browserStore(), next);
    draw();
  });
  const draw = (): void => {
    if (ingredientId !== undefined && chosen === undefined) return results.replaceChildren();
    const found = find(source, today, filters, ingredientId);
    if (!found.ok) {
      results.replaceChildren(el('p', 'note-quiet', t.problem));
      return;
    }
    controls.setRoles(found.roles);
    results.replaceChildren(found.shown.length === 0 ? emptyState(found) : list(found));
  };
  draw();

  const ticked = new Set(
    source.stock.filter((s) => s.ref.kind === 'ingredient').map((s) => s.ref.id),
  );
  section.append(controls.element, startSection(listIngredients(), ticked, false), results);
  return section;
};
