// The source a classic follows: author, title, year, place, a link, the persons it states, and the
// second check the dish had.
import type { DishView } from '../../classics/dish-view';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.classics;

export const sourceBlock = (view: DishView): HTMLElement => {
  const { source, persons, check } = view;
  const block = el('section', 'source-block');
  block.append(
    el('h2', undefined, t.sourceHeading),
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
    el('h3', undefined, t.checkHeading),
    el('p', 'muted', t.checkMethod[check.method]),
    el('p', 'muted', check.note),
  );
  return block;
};
