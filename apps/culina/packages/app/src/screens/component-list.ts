// The list pane of the Components screen: the notebook's components and the shipped ones in one
// list (components/list.ts), the search, a choice of origin (Mine, Shipped, as in the dish filter)
// and two groups with a heading each. A shipped row says "Shipped" and names its dish. While the
// notebook has none of its own, its group says so and offers the example data.
import type { Origin } from '../browse/entry';
import { componentGroups, type ComponentRow } from '../components/list';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { select } from './dish-filter';
import { paneGuidance, paneHead, type ListText, type PaneOptions } from './entry-list';
import { nextId } from './fields';

/** The search text and the origin choice, kept while the page is open. */
export interface ComponentListState {
  query: string;
  origin?: Origin;
}

const row = (entry: ComponentRow, current?: string): HTMLElement => {
  const item = el('li');
  const a = el('a', `entry-row row-link component-row component-row-${entry.origin}`);
  a.href = hashFor('components', entry.id);
  if (entry.id === current) a.setAttribute('aria-current', 'page');
  a.append(el('span', 'entry-name', entry.name));
  if (entry.meta !== '') a.append(el('span', 'entry-meta', entry.meta));
  item.append(a);
  return item;
};

const rowList = (rows: readonly ComponentRow[], label: string, current?: string): HTMLElement => {
  const list = el('ul', 'rows');
  list.setAttribute('aria-label', label);
  list.append(...rows.map((r) => row(r, current)));
  return list;
};

export const componentList = (
  rows: readonly ComponentRow[],
  state: ComponentListState,
  text: ListText,
  options: PaneOptions,
): HTMLElement => {
  const pane = el('section', 'entry-list split-list components-pane');
  paneHead(pane, text, options);
  const ownTotal = rows.filter((r) => r.origin === 'own').length;
  const anyShipped = rows.some((r) => r.origin === 'shipped');

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
  const controls = el('div', 'component-filters');
  controls.append(wrap);

  const groups = el('div', 'groups');
  const draw = (): void => {
    const shown = componentGroups(rows, state.origin, state.query);
    const both = shown.own !== undefined && shown.shipped !== undefined;
    const parts: Node[] = [];
    const heading = (words: string): void => {
      if (both) parts.push(el('h2', 'component-group-heading', words));
    };
    let listed = false;
    if (shown.own !== undefined) {
      if (ownTotal === 0) {
        heading(strings.components.groupOwn);
        parts.push(el('p', 'empty', text.emptyNotebook), ...(options.emptyActions ?? []));
        listed = true;
      } else if (shown.own.length > 0) {
        heading(strings.components.groupOwn);
        parts.push(rowList(shown.own, strings.components.groupOwn, options.current));
        listed = true;
      }
    }
    if (shown.shipped !== undefined && shown.shipped.length > 0) {
      heading(strings.components.groupShipped);
      parts.push(rowList(shown.shipped, strings.components.groupShipped, options.current));
      listed = true;
    }
    if (!listed) parts.push(el('p', 'empty', text.empty));
    groups.replaceChildren(...parts);
  };

  if (anyShipped) {
    const t = strings.browse;
    controls.append(
      select(
        'component-filter-origin',
        t.originLabel,
        strings.components.originAny,
        (['own', 'shipped'] as const).map((o) => ({ value: o, label: t.originChoice[o] })),
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
