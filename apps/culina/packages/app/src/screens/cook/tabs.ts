// The tabs at the top of Cook: two parts (with what I have, classics), and in the first the three views
// what can I cook, use up first, what is there. The current one is marked with aria-current, a bold
// label and a bar, not by colour alone.
import { hashFor, USE_UP } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { sectionTabs } from '../section-tabs';

const t = strings.cook;

export type CookView = 'cook' | 'use-up' | 'stock' | 'classics';

const VIEWS: readonly { view: Exclude<CookView, 'classics'>; hash: string; label: string }[] = [
  { view: 'cook', hash: hashFor('cook'), label: t.tabCook },
  { view: 'use-up', hash: hashFor('cook', USE_UP), label: t.tabUseUp },
  { view: 'stock', hash: hashFor('stock'), label: t.tabStock },
];

export const cookTabs = (current: CookView): HTMLElement => {
  const wrap = el('div', 'cook-nav');
  wrap.append(
    sectionTabs(t.sectionsLabel, [
      { label: t.sectionStock, hash: hashFor('cook'), current: current !== 'classics' },
      { label: t.sectionClassics, hash: hashFor('classics'), current: current === 'classics' },
    ]),
  );
  if (current === 'classics') return wrap;
  // A group, not a landmark: the page keeps its one navigation.
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
  wrap.append(nav);
  return wrap;
};
