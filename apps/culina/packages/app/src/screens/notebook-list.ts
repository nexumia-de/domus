// The list pane of the Notebook's two parts, Components and Dishes: the user's own and the shipped
// ones in one plain list (shared/notebook-rows.ts), the search, a choice of origin (Mine, Shipped,
// the values of the dish filter's origin) and two groups with a heading each. A shipped row says
// "Shipped" in its muted line. While the notebook has none of its own, its group says so and
// offers the example data. No dish filter and no finder: those are Cook's.
import type { Origin } from '../browse/entry';
import { notebookGroups, type NotebookRow } from '../shared/notebook-rows';
import { el } from '../shell/el';
import { strings } from '../strings';
import { select } from './dish-filter';
import { paneGuidance, paneHead, type ListText, type PaneOptions } from './entry-list';
import { nextId } from './fields';

/** The search text and the origin choice, kept while the page is open. */
export interface NotebookListState {
  query: string;
  origin?: Origin;
}

export interface NotebookListText extends ListText {
  /** The first choice of the origin select: "All components", "All dishes". */
  originAny: string;
}

/** Called when a row is tapped, before it opens: the Dishes part notes its list for the way back. */
export type OnOpen = (row: NotebookRow) => void;

const row = (entry: NotebookRow, current?: string, onOpen?: OnOpen): HTMLElement => {
  const item = el('li');
  const a = el('a', `entry-row row-link notebook-row notebook-row-${entry.origin}`);
  a.href = entry.href;
  if (onOpen !== undefined) a.addEventListener('click', () => onOpen(entry));
  if (entry.id === current) a.setAttribute('aria-current', 'page');
  a.append(el('span', 'entry-name', entry.name));
  if (entry.meta !== '') a.append(el('span', 'entry-meta', entry.meta));
  item.append(a);
  return item;
};

const rowList = (
  rows: readonly NotebookRow[],
  label: string,
  current?: string,
  onOpen?: OnOpen,
): HTMLElement => {
  const list = el('ul', 'rows');
  list.setAttribute('aria-label', label);
  list.append(...rows.map((r) => row(r, current, onOpen)));
  return list;
};

/**
 * @param className - The pane's own class (`components-pane`, `dishes-pane`).
 * @param onOpen - Called when a row is tapped.
 */
export const notebookList = (
  className: string,
  rows: readonly NotebookRow[],
  state: NotebookListState,
  text: NotebookListText,
  options: PaneOptions,
  onOpen?: OnOpen,
): HTMLElement => {
  const pane = el('section', `entry-list split-list ${className}`);
  paneHead(pane, text, options);
  const ownTotal = rows.filter((r) => r.origin === 'own').length;
  const anyShipped = rows.some((r) => r.origin === 'shipped');
  const t = strings.notebook;

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
  const controls = el('div', 'notebook-filters');
  controls.append(wrap);

  const groups = el('div', 'groups');
  const draw = (): void => {
    const shown = notebookGroups(rows, state.origin, state.query);
    const both = shown.own !== undefined && shown.shipped !== undefined;
    const parts: Node[] = [];
    const heading = (words: string): void => {
      if (both) parts.push(el('h2', 'notebook-group-heading', words));
    };
    let listed = false;
    if (shown.own !== undefined) {
      if (ownTotal === 0) {
        heading(t.groupOwn);
        parts.push(el('p', 'empty', text.emptyNotebook), ...(options.emptyActions ?? []));
        listed = true;
      } else if (shown.own.length > 0) {
        heading(t.groupOwn);
        parts.push(rowList(shown.own, t.groupOwn, options.current, onOpen));
        listed = true;
      }
    }
    if (shown.shipped !== undefined && shown.shipped.length > 0) {
      heading(t.groupShipped);
      parts.push(rowList(shown.shipped, t.groupShipped, options.current, onOpen));
      listed = true;
    }
    if (!listed) parts.push(el('p', 'empty', text.empty));
    groups.replaceChildren(...parts);
  };

  if (anyShipped) {
    const b = strings.browse;
    controls.append(
      select(
        'notebook-filter-origin',
        b.originLabel,
        text.originAny,
        (['own', 'shipped'] as const).map((o) => ({ value: o, label: b.originChoice[o] })),
        state.origin,
        (value) => {
          if (value === 'own' || value === 'shipped') state.origin = value;
          else delete state.origin;
          draw();
        },
      ),
    );
  }
  search.addEventListener('input', () => {
    state.query = search.value;
    draw();
  });
  draw();
  pane.append(controls, groups, paneGuidance(text));
  return pane;
};
