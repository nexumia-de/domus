// The list pane of the Drinks destination in every state of the data; the
// spec screen shows the same pane beside the drink on a wide screen.

import { h } from '../../dom';
import { type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { browseState } from '../browse/load';
import { status } from '../status';
import { drinksListPane } from './list';

export function loadingStatus(): HTMLElement {
  return h('div', { class: 'status', role: 'status' }, h('p', {}, strings.browse.loading));
}

export function failedStatus(reason: string): HTMLElement {
  return h(
    'div',
    { class: 'status' },
    h('h2', {}, strings.browse.loadFailedTitle),
    h('p', {}, strings.browse.loadFailedText),
    h('p', { class: 'note' }, reason),
  );
}

export function drinksPane(
  context: ScreenContext,
  phone: 'list' | 'detail',
  selected?: string,
): NonNullable<ScreenView['list']> {
  const state = browseState(context);
  if (state.kind === 'ready') {
    return { ...drinksListPane(context, state.model, selected), phone };
  }
  return {
    title: strings.titles.drinks,
    body: state.kind === 'loading' ? loadingStatus() : failedStatus(state.reason),
    phone,
  };
}

/** The detail pane when no drink is open (wide screens). */
export function selectDrink(): HTMLElement {
  return status(strings.browse.selectDrink);
}
