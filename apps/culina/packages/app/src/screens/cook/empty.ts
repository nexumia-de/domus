// The empty states of the finder from one ingredient, each with the way forward: nothing ticked
// (also on Cook's list under "Only with what I have"), nothing in the notebook, or nothing that
// matches, in which case the nearest candidates under the same choices are named with what they
// lack.
import type { Found } from '../../cook/finder';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { rowOf } from './entry';

const t = strings.cook;

type Ok = Extract<Found, { ok: true }>;

const link = (className: string, text: string, href: string): HTMLAnchorElement => {
  const a = el('a', className, text);
  a.href = href;
  return a;
};

/** Nothing ticked yet: the way to tick. */
export const nothingTicked = (): HTMLElement => {
  const box = el('div', 'cook-empty');
  box.append(
    el('p', 'empty', t.emptyNothingTicked),
    link('btn primary new-link', t.tickLink, hashFor('stock', undefined, 'add')),
  );
  return box;
};

/** The notebook has no component or dish: the ways to write or import one. */
export const noNotebook = (): HTMLElement => {
  const box = el('div', 'cook-empty');
  box.append(
    el('p', 'empty', t.emptyNoNotebook),
    link('btn primary new-link', t.addComponent, hashFor('components', undefined, 'new')),
    link('btn new-link', t.importLink, hashFor('settings', undefined, 'import')),
  );
  return box;
};

const nearestList = (found: Ok): HTMLElement => {
  const list = el('ul', 'rows cook-nearest');
  for (const candidate of found.nearest) {
    const row = rowOf(candidate, found);
    const item = el('li');
    item.dataset.origin = row.origin;
    const a = el('a', 'entry-row row-link cook-link');
    a.href = row.href;
    a.append(
      el('span', 'entry-name', t.nearest(row.name, row.lacks.join(', '))),
      el('span', 'entry-meta cook-reason', row.reason),
    );
    item.append(a);
    list.append(item);
  }
  return list;
};

/** Nothing is shown: why, and the nearest. */
export const emptyState = (found: Ok, notebookEmpty: boolean): HTMLElement => {
  const box = notebookEmpty ? noNotebook() : el('div', 'cook-empty');
  if (!notebookEmpty)
    box.append(
      el(
        'p',
        'empty',
        found.narrowed || found.nearest.length > 0
          ? t.emptyNoMatch
          : `${t.emptyNoMatch} ${t.emptyNothingRelated}`,
      ),
    );
  if (found.nearest.length > 0)
    box.append(el('h2', 'cook-nearest-heading', t.nearestHeading), nearestList(found));
  return box;
};
