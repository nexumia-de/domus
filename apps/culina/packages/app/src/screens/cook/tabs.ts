// The views at the top of Cook, which is "what the stock allows": what can I cook, use up first,
// what is there. The current one is marked with aria-current, a bold label and a bar, not by
// colour alone. A group, not a landmark: the page keeps its one navigation.
import { hashFor, USE_UP } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.cook;

export type CookView = 'cook' | 'use-up' | 'stock';

const VIEWS: readonly { view: CookView; hash: string; label: string }[] = [
  { view: 'cook', hash: hashFor('cook'), label: t.tabCook },
  { view: 'use-up', hash: hashFor('cook', USE_UP), label: t.tabUseUp },
  { view: 'stock', hash: hashFor('stock'), label: t.tabStock },
];

export const cookTabs = (current: CookView): HTMLElement => {
  const nav = el('div', 'cook-tabs');
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', t.viewsLabel);
  const list = el('ul', 'cook-tab-list');
  for (const { view, hash, label } of VIEWS) {
    const link = el('a', 'cook-tab', label);
    link.href = hash;
    if (view === current) link.setAttribute('aria-current', 'page');
    const item = el('li');
    item.append(link);
    list.append(item);
  }
  nav.append(list);
  return nav;
};
