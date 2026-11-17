// The segmented control of the Stock destination: Stock and Buy Next.

import { h } from '../../dom';
import { strings } from '../../strings';

export function views(active: 'stock' | 'buy-next'): HTMLElement {
  const link = (id: 'stock' | 'buy-next', label: string, href: string): HTMLElement =>
    h('a', { href, 'aria-current': active === id ? 'true' : undefined }, label);
  return h(
    'div',
    { class: 'segmented', role: 'group', 'aria-label': 'Stock views' },
    link('stock', strings.titles.stock, '#/stock'),
    link('buy-next', strings.titles.buyNext, '#/stock/buy-next'),
  );
}
