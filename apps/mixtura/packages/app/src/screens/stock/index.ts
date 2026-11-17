// Stock destination with its two views; placeholders until #30 and #33.

import { h } from '../../dom';
import { type Screen } from '../../screen';
import { strings } from '../../strings';
import { status } from '../status';

function views(active: 'stock' | 'buy-next'): HTMLElement {
  const link = (id: 'stock' | 'buy-next', label: string, href: string): HTMLElement =>
    h('a', { href, 'aria-current': active === id ? 'true' : undefined }, label);
  return h(
    'div',
    { class: 'segmented', role: 'group', 'aria-label': 'Stock views' },
    link('stock', strings.titles.stock, '#/stock'),
    link('buy-next', strings.titles.buyNext, '#/stock/buy-next'),
  );
}

export const screens: Screen[] = [
  {
    id: 'stock',
    destination: 'stock',
    pushed: false,
    match: (route) => route.path.length === 1 && route.path[0] === 'stock',
    view: () => ({
      title: strings.titles.stock,
      body: h('div', { class: 'stack' }, views('stock'), status(strings.empty.stock)),
    }),
  },
  {
    id: 'buy-next',
    destination: 'stock',
    pushed: false,
    match: (route) =>
      route.path.length === 2 && route.path[0] === 'stock' && route.path[1] === 'buy-next',
    view: () => ({
      title: strings.titles.buyNext,
      body: h('div', { class: 'stack' }, views('buy-next'), status(strings.empty.buyNext)),
    }),
  },
];
