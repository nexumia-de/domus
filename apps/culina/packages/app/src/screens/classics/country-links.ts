// The four countries as a list of links, each with the number of its dishes.
import type { CountryChoice } from '../../classics/list-view';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.classics;

export const countryLinks = (choices: readonly CountryChoice[]): HTMLElement => {
  const list = el('ul', 'rows country-list');
  for (const { country, count } of choices) {
    const item = el('li');
    item.dataset.country = country;
    const link = el('a', 'row-link', t.countryLink(t.countries[country], count));
    link.href = hashFor('classics', country);
    item.append(link);
    list.append(item);
  }
  return list;
};
