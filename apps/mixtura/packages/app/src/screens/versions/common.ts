// Pieces the versions, version and diff screens share: the not-found page
// and the loading/failed answers of the browse model.

import { h } from '../../dom';
import { type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { browseState } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import { drinksPane, failedStatus, loadingStatus } from '../drinks/pane';
import { versionStrings as vs } from './strings';

/** The model when ready; otherwise the view to show instead. */
export function modelOr(context: ScreenContext): { model: BrowseModel } | { view: ScreenView } {
  const state = browseState(context);
  if (state.kind === 'ready') return { model: state.model };
  return {
    view: {
      title: strings.titles.drinks,
      body: state.kind === 'loading' ? loadingStatus() : failedStatus(state.reason),
      list: drinksPane(context, 'detail'),
    },
  };
}

export function notFound(context: ScreenContext, title: string, text: string): ScreenView {
  return {
    title: strings.titles.notFound,
    body: h(
      'div',
      { class: 'status' },
      h('h2', {}, title),
      h('p', {}, text),
      h('a', { class: 'btn btn--primary', href: '#/drinks' }, strings.buttons.openDrinks),
    ),
    list: drinksPane(context, 'detail'),
  };
}

export const noVersion = (context: ScreenContext): ScreenView =>
  notFound(context, vs.notFound, vs.notFoundText);
