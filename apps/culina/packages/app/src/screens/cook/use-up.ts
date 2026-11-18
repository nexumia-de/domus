// "Use up first": the stock items that have a use-by date, the nearest first, each with the
// components and dishes that use it. Tapping an item opens it in the stock screen. The order and
// the days come from the engine's `useUpFirst`; the candidates counted are those within the
// same "lacking at most" choice as the finder.
import { browserStore, readCookFilters } from '../../prefs';
import { cookToday, notebookSource } from '../../cook/source';
import { find } from '../../cook/finder';
import { daysText, hrefOf, keyOf } from '../../cook/rows';
import { storeProblem } from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
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
  const filters = readCookFilters(browserStore());
  const found = find(notebookSource(), today, filters);
  section.append(el('p', 'muted cook-asof', t.asOf(today)));
  if (!found.ok) {
    section.append(el('p', 'note-quiet', t.problem));
    return section;
  }
  section.append(el('p', 'muted', `${t.useUpIntro} ${t.useUpThreshold(filters.lacking)}`));
  if (found.useUpFirst.length === 0) {
    section.append(el('p', 'empty', t.useUpNoDates));
    return section;
  }
  const names = new Map(found.within.map((c) => [keyOf(c), c.name]));
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
        const link = el('a', 'use-up-recipe', names.get(keyOf(c)) ?? c.id);
        link.href = hrefOf(c);
        const li = el('li');
        li.append(link);
        links.append(li);
      }
      uses.append(links);
    }
    item.append(uses);
    list.append(item);
  }
  section.append(list);
  return section;
};
