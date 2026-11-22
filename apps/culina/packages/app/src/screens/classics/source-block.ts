// The source a classic follows, closed behind a tap at the foot of the dish screen: the ingredients
// and the method come first. One short line (author, title, year) and the link, in the user's
// language; then, only here, what the source says in its own words and our remarks about it.
import type { DishView } from '../../classics/dish-view';
import { appLang } from '../../shared/locale';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { citeText } from './cite';

const t = strings.classics;

/** Author, title, year, place, a link, the persons the source states, how it was checked and the remarks about the source. */
export const sourceDetails = (view: DishView): HTMLDetailsElement => {
  const { source, persons, sourceRemarks, note } = view;
  const block = el('details', 'source-block foot-block');
  block.append(el('summary', undefined, t.sourceHeading));
  block.append(
    el('p', undefined, t.sourceLine(source.author, citeText(source.title, appLang), source.year)),
    el('p', 'muted', t.sourcePlace(citeText(source.place, appLang))),
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
    el('p', 'muted', t.checkMethod[view.check.method]),
  );
  if (note !== undefined || sourceRemarks.lines.length > 0 || sourceRemarks.steps.length > 0) {
    block.append(el('h3', undefined, t.remarksHeading));
    // The transcriber's note on the dish (what was left out of the source, what it gives no size for).
    if (note !== undefined) block.append(el('p', undefined, t.remarkDish(note)));
    const list = el('ul', 'source-remarks');
    for (const line of sourceRemarks.lines)
      list.append(el('li', undefined, t.remarkLine(line.name, line.original, line.remark)));
    for (const step of sourceRemarks.steps)
      list.append(el('li', undefined, t.remarkStep(step.number, step.remark)));
    block.append(list);
  }
  return block;
};
