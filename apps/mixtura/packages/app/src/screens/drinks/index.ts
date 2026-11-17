// Drinks destination: placeholder until #18 builds the list.

import { h } from '../../dom';
import { type Route } from '../../router';
import { type Screen } from '../../screen';
import { strings } from '../../strings';
import { status } from '../status';

const is = (route: Route, ...path: string[]): boolean =>
  route.path.length === path.length && path.every((segment, i) => route.path[i] === segment);

export const screens: Screen[] = [
  {
    id: 'drinks',
    destination: 'drinks',
    pushed: false,
    match: (route) => is(route, 'drinks'),
    view: () => ({
      title: strings.titles.drinks,
      body: status(strings.empty.drinks, { label: strings.buttons.newDrink, href: '#/drinks/new' }),
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
