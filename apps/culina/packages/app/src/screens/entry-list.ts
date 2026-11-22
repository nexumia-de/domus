// The list pane of the Components screen (Dishes has its own, dish-list.ts): the action to add
// one, search by name, one link per entry, a quiet empty state that invites, and the collapsible
// guidance.
import { filterByName } from '../shared/search';
import { hashFor, type Route } from '../router';
import { el } from '../shell/el';
import { nextId } from './fields';

export interface Entry {
  id: string;
  name: string;
  /** A short muted line under the name. */
  meta: string;
}

export interface ListState {
  query: string;
}

/** What a list pane is given by the screen around it (notebook-screen.ts). */
export interface PaneOptions {
  /** With it the pane carries the screen's h1; beside a detail it is a labelled region. */
  asHeading: boolean;
  current?: string;
  note?: string;
  /** The parts of the Notebook, right under the title. */
  tabs?: Node;
  /** Shown under the title: the way to add one. */
  actions?: Node[];
  /** Shown with the empty state: example data. */
  emptyActions?: Node[];
}

export interface ListText {
  title: string;
  searchLabel: string;
  listLabel: string;
  /** No entry matches the search. */
  empty: string;
  /** The notebook has none of these yet. */
  emptyNotebook: string;
  guidanceSummary: string;
  guidance: string;
}

const row = (route: Route, entry: Entry, current?: string): HTMLElement => {
  const item = el('li');
  const a = el('a', 'entry-row row-link');
  a.href = hashFor(route, entry.id);
  if (entry.id === current) a.setAttribute('aria-current', 'page');
  a.append(el('span', 'entry-name', entry.name));
  if (entry.meta !== '') a.append(el('span', 'entry-meta', entry.meta));
  item.append(a);
  return item;
};

/** The head of a list pane: the h1 or the region's label, the parts, a note and the actions. */
export const paneHead = (pane: HTMLElement, text: ListText, options: PaneOptions): void => {
  if (options.asHeading) pane.append(el('h1', undefined, text.title));
  else pane.setAttribute('aria-label', text.listLabel);
  if (options.tabs !== undefined) pane.append(options.tabs);
  if (options.note !== undefined) pane.append(el('p', 'note-quiet', options.note));
  if (options.actions !== undefined) pane.append(...options.actions);
};

/** The collapsible guidance at the foot of a list pane. */
export const paneGuidance = (text: ListText): HTMLElement => {
  const guidance = el('details', 'guidance');
  guidance.append(
    el('summary', undefined, text.guidanceSummary),
    el('p', undefined, text.guidance),
  );
  return guidance;
};

export const entryList = (
  route: Route,
  entries: readonly Entry[],
  state: ListState,
  text: ListText,
  options: PaneOptions,
): HTMLElement => {
  const pane = el('section', 'entry-list split-list');
  paneHead(pane, text, options);

  const search = el('input', 'field');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.id = nextId('search');
  search.value = state.query;
  const label = el('label', 'field-label', text.searchLabel);
  label.htmlFor = search.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(label, search);

  const rows = el('div', 'groups');
  const draw = (): void => {
    rows.replaceChildren();
    const shown = filterByName(entries, state.query);
    if (entries.length === 0) {
      rows.append(el('p', 'empty', text.emptyNotebook), ...(options.emptyActions ?? []));
      return;
    }
    if (shown.length === 0) {
      rows.append(el('p', 'empty', text.empty));
      return;
    }
    const list = el('ul', 'rows');
    list.append(...shown.map((entry) => row(route, entry, options.current)));
    rows.append(list);
  };
  search.addEventListener('input', () => {
    state.query = search.value;
    draw();
  });
  draw();

  pane.append(wrap, rows, paneGuidance(text));
  return pane;
};
