// The templates overview: the list pane of the Templates destination.

import { searchField } from '../../components/search-field';
import { h } from '../../dom';
import { replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { browseState } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import { failedStatus, loadingStatus } from '../drinks/pane';
import { status } from '../status';
import { templateRows } from './view-model';

function listBody(context: ScreenContext, model: BrowseModel, selected?: string): HTMLElement {
  const q = context.route.query.get('q') ?? '';
  const rows = templateRows(model, q);
  const query = (value: string): string => {
    const params = new URLSearchParams(context.route.query);
    if (value) params.set('q', value);
    else params.delete('q');
    return formatHash(context.route.path, params);
  };
  const href = (id: string): string =>
    formatHash(['templates', id], q ? new URLSearchParams({ q }) : undefined);
  return h(
    'div',
    { class: 'list-body' },
    searchField({
      value: q,
      label: strings.templates.searchLabel,
      hint: strings.templates.searchLabel,
      clearLabel: strings.templates.clearSearch,
      onChange: (value) => replace(context.store, query(value)),
    }),
    rows.length === 0
      ? status(strings.templates.noHit, {
          label: strings.templates.clearSearch,
          onclick: () => replace(context.store, query('')),
        })
      : h(
          'ul',
          { class: 'rows list-rows' },
          ...rows.map((row) =>
            h(
              'li',
              {},
              h(
                'a',
                {
                  class: row.variant ? 'row row--variant' : 'row',
                  href: href(row.id),
                  'aria-current': row.id === selected ? 'true' : undefined,
                },
                h(
                  'span',
                  { class: 'row-main' },
                  h('span', { class: 'row-title' }, row.name),
                  h('span', { class: 'row-sub' }, row.roles),
                  h(
                    'span',
                    { class: 'row-sub' },
                    `${row.method} · ${strings.templates.drinksCount(row.drinks)}`,
                  ),
                ),
                row.user && h('span', { class: 'tag' }, strings.templates.user),
              ),
            ),
          ),
        ),
  );
}

export function templatesPane(
  context: ScreenContext,
  phone: 'list' | 'detail',
  selected?: string,
): NonNullable<ScreenView['list']> {
  const state = browseState(context);
  const title = strings.titles.templates;
  if (state.kind === 'ready') {
    return { title, body: listBody(context, state.model, selected), phone };
  }
  return {
    title,
    body: state.kind === 'loading' ? loadingStatus() : failedStatus(state.reason),
    phone,
  };
}
