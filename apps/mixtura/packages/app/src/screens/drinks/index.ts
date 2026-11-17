// Drinks destination: the list with search and filters (#18). The spec
// screen is in screens/spec; both show this list in the first pane.

import { h } from '../../dom';
import { type Route } from '../../router';
import { type Screen } from '../../screen';
import { strings } from '../../strings';
import { drinksPane, selectDrink } from './pane';

const is = (route: Route, ...path: string[]): boolean =>
  route.path.length === path.length && path.every((segment, i) => route.path[i] === segment);

export const screens: Screen[] = [
  {
    id: 'drinks',
    destination: 'drinks',
    pushed: false,
    match: (route) => is(route, 'drinks'),
    view: (context) => ({
      title: strings.titles.drinks,
      body: selectDrink(),
      list: drinksPane(context, 'list'),
    }),
  },
  {
    id: 'drinks-new',
    destination: 'drinks',
    pushed: true,
    match: (route) => is(route, 'drinks', 'new'),
    view: () => ({
      title: strings.titles.newDrink,
      body: h('div', { class: 'status' }, h('p', {}, strings.placeholder)),
    }),
  },
];
