// #/classics and #/classics/<country>: the countries, and the dishes of one country, each with its
// name, course and whether it is without meat and fish. An empty country says so quietly.
import { classics } from '../../classics/content';
import { classicRows, countryChoices, isCountry } from '../../classics/list-view';
import { currentLang } from '../../classics/lang';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { countryLinks } from './country-links';

const t = strings.classics;

export const classicsScreen = (param?: string): HTMLElement => {
  const section = el('section', 'screen classics-screen');
  const back = el('a', 'family-link', t.backToStart);
  back.href = hashFor('start');
  if (param === undefined || !isCountry(param)) {
    section.append(back, el('h1', undefined, t.classicsHeading));
    if (param !== undefined) section.append(el('p', 'note-quiet', t.unknownCountry));
    section.append(countryLinks(countryChoices(classics())));
    return section;
  }
  const country = t.countries[param];
  const all = el('a', 'family-link', t.classicsHeading);
  all.href = hashFor('classics');
  section.append(all, el('h1', undefined, country));
  const rows = classicRows(classics(), param, currentLang());
  if (rows.length === 0) {
    section.append(el('p', 'note-quiet empty-country', t.emptyCountry));
    return section;
  }
  const list = el('ul', 'rows classic-list');
  list.setAttribute('aria-label', t.listLabel(country));
  for (const row of rows) {
    const item = el('li');
    item.dataset.id = row.id;
    const link = el('a', 'row-link classic-link');
    link.href = hashFor('classic', row.id);
    link.append(
      el('span', 'entry-name', row.name),
      el('span', 'entry-meta', t.course[row.course]),
      el('span', 'entry-meta', row.vegetarian ? t.withoutMeat : t.withMeat),
    );
    item.append(link);
    list.append(item);
  }
  section.append(list);
  return section;
};
