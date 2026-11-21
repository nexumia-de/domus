// "Use up first": the stock items that have a use-by date, the nearest first, each with what uses
// it among the entries of "What can I cook" under the same choices: the same "lacking at most" and
// role, and the same dish filter (own and shipped dishes; components and ratio cards while no dish
// filter is chosen). Tapping an item opens it in the stock screen. The order and the days come
// from the engine's `useUpFirst`, the order of what uses an item from its one ranking.
import { isEmptyFilter, readDishFilter } from '../../browse/filter';
import { loadNames } from '../../classics/names';
import { carryOldCookChoices } from '../../cook/carry';
import { dishEntriesByKey } from '../../browse/entries';
import { shippedNow } from '../../cook/entries';
import { find } from '../../cook/finder';
import { daysText } from '../../cook/rows';
import { cookToday, notebookSource } from '../../cook/source';
import { storeProblem } from '../../notebook';
import { browserStore, readCookFilters } from '../../prefs';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { rowOf } from './entry';
import { cookTabs } from './tabs';

const t = strings.cook;

export const useUpScreen = (): HTMLElement => {
  const section = el('section', 'screen cook-screen use-up-screen');
  section.append(el('h1', undefined, t.tabUseUp), cookTabs('use-up'));
  const problem = storeProblem();
  if (problem !== undefined) {
    section.append(el('p', 'note-quiet', storeText(problem)));
    return section;
  }
  const today = cookToday();
  const store = browserStore();
  carryOldCookChoices(store);
  const filters = readCookFilters(store);
  const filter = readDishFilter(store);
  section.append(el('p', 'muted cook-asof', t.asOf(today)));
  section.append(el('p', 'muted', `${t.useUpIntro} ${t.useUpThreshold(filters.lacking)}`));
  if (!isEmptyFilter(filter) || filters.role !== undefined)
    section.append(el('p', 'muted use-up-filtered', t.useUpFiltered));
  const body = el('div', 'use-up-body');
  section.append(body);

  const draw = (): void => {
    const found = find(notebookSource(), today, filters, {
      filter,
      entries: dishEntriesByKey(),
      shipped: shippedNow(),
    });
    if (!found.ok) return body.replaceChildren(el('p', 'note-quiet', t.problem));
    if (found.useUpFirst.length === 0)
      return body.replaceChildren(el('p', 'empty', t.useUpNoDates));
    const list = el('ul', 'rows use-up-rows');
    list.setAttribute('aria-label', t.useUpLabel);
    for (const up of found.useUpFirst) {
      const ref = found.look.itemRef(up.itemId);
      const name = ref === undefined ? up.itemId : found.look.name(ref);
      const item = el('li', 'use-up-item');
      item.dataset.itemId = up.itemId;
      const open = el('a', 'entry-row row-link use-up-link');
      open.href = hashFor('stock', up.itemId, 'edit');
      open.setAttribute('aria-label', `${t.useUpOpenItem(name)}, ${daysText(up.daysLeft)}`);
      open.append(
        el('span', 'entry-name', name),
        el('span', 'entry-meta use-up-days', daysText(up.daysLeft)),
      );
      item.append(open);
      const uses = el('div', 'use-up-uses');
      if (up.candidates.length === 0) uses.append(el('p', 'muted', t.useUpNothing));
      else {
        uses.append(el('p', 'muted', t.useUpUsedBy));
        const links = el('ul', 'use-up-links');
        for (const c of up.candidates) {
          const row = rowOf(c, found);
          const link = el('a', 'use-up-recipe', row.name);
          link.href = row.href;
          const li = el('li');
          li.dataset.origin = row.origin;
          li.append(link);
          links.append(li);
        }
        uses.append(links);
      }
      item.append(uses);
      list.append(item);
    }
    body.replaceChildren(list);
  };
  draw();
  void loadNames().then(() => {
    if (!section.isConnected && section.parentNode === null) return;
    draw();
  });
  return section;
};
