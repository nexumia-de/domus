// The empty states of the finder, each with the way forward: nothing ticked, nothing in the
// notebook, or nothing that matches, in which case the nearest candidates are named with what
// they lack.
import { cookRow, hrefOf } from '../../cook/rows';
import type { Found } from '../../cook/finder';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.cook;

const link = (className: string, text: string, href: string): HTMLAnchorElement => {
  const a = el('a', className, text);
  a.href = href;
  return a;
};

type Ok = Extract<Found, { ok: true }>;

export const emptyState = (found: Ok): HTMLElement => {
  const box = el('div', 'cook-empty');
  if (!found.hasStock) {
    box.append(
      el('p', 'empty', t.emptyNothingTicked),
      link('btn primary new-link', t.tickLink, hashFor('stock', undefined, 'add')),
    );
    return box;
  }
  if (!found.hasRecipes && found.within.length === 0) {
    box.append(
      el('p', 'empty', t.emptyNoNotebook),
      link('btn primary new-link', t.addComponent, hashFor('components', undefined, 'new')),
      link('btn new-link', t.importLink, hashFor('settings', undefined, 'import')),
    );
    return box;
  }
  if (found.nearest.length === 0) {
    box.append(
      el(
        'p',
        'empty',
        found.narrowed ? t.emptyNoMatch : `${t.emptyNoMatch} ${t.emptyNothingRelated}`,
      ),
    );
    return box;
  }
  box.append(el('p', 'empty', t.emptyNoMatch), el('h2', 'cook-nearest-heading', t.nearestHeading));
  const list = el('ul', 'rows cook-nearest');
  for (const candidate of found.nearest) {
    const row = cookRow(candidate, found.look, () => []);
    const item = el('li');
    const a = el('a', 'entry-row row-link cook-link');
    a.href = hrefOf(candidate);
    a.append(
      el('span', 'entry-name', t.nearest(row.name, row.lacks.join(', '))),
      el('span', 'entry-meta cook-reason', row.reason),
    );
    item.append(a);
    list.append(item);
  }
  box.append(list);
  return box;
};
