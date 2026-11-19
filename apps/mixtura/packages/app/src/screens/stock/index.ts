// Stock destination with its two views: Stock (#30) and Buy Next (#33).

import { type Screen } from '../../screen';
import { buyNextView } from './buy-next';
import { stockView } from './stock-screen';

export const screens: Screen[] = [
  {
    id: 'stock',
    destination: 'stock',
    pushed: false,
    match: (route) => route.path.length === 1 && route.path[0] === 'stock',
    view: stockView,
  },
  {
    id: 'buy-next',
    destination: 'stock',
    pushed: false,
    match: (route) =>
      route.path.length === 2 && route.path[0] === 'stock' && route.path[1] === 'buy-next',
    view: buyNextView,
  },
];
