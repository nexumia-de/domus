// The source a classic follows and the second check the dish had, each closed behind a tap at the
// foot of the dish screen: the ingredients and the method come first.
import type { DishView } from '../../classics/dish-view';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.classics;

const closed = (className: string, summary: string): HTMLDetailsElement => {
  const details = el('details', `${className} foot-block`);
  details.append(el('summary', undefined, summary));
  return details;
};

/** Author, title, year, place, a link and the persons the source states. */
export const sourceDetails = (view: DishView): HTMLElement => {
  const { source, persons } = view;
  const block = closed('source-block', t.sourceHeading);
  block.append(
    el('p', undefined, t.sourceLine(source.author, source.title, source.year)),
    el('p', 'muted', t.sourcePlace(source.place)),
  );
  if (source.licence !== undefined) block.append(el('p', 'muted', t.sourceLicence(source.licence)));
  const link = el('a', 'source-link', t.sourceLink);
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  block.append(
    link,
    el(
      'p',
      'muted',
      persons.basis === 'stated' ? t.personsStated(persons.value) : t.personsSettled(persons.value),
    ),
  );
  return block;
};

/** How the dish was read a second time. */
export const checkDetails = (view: DishView): HTMLElement => {
  const block = closed('check-block', t.checkHeading);
  block.append(
    el('p', 'muted', t.checkMethod[view.check.method]),
    el('p', 'muted', view.check.note),
  );
  return block;
};
