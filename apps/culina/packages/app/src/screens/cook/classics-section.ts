// The classics in "What can I cook": below the notebook's own list, with a filter by country and
// by "without meat and fish". Every entry is one link to its dish view; the words are the same as
// for an own dish, with "Needs" in place of "Lacks" and the lines the catalogue lacks named apart.
// The judging is the engine's (`classicsMakeable`); nothing is computed here.
import { classics as shippedClassics } from '../../classics/content';
import { currentLang } from '../../classics/lang';
import { catalogueEntries, loadNames } from '../../classics/names';
import { cookToday, notebookSource } from '../../cook/source';
import { classicLookup, classicRow } from '../../cook/classic-rows';
import type { ClassicRow } from '../../cook/classic-rows';
import { findClassics } from '../../cook/classic-finder';
import { lookupOf } from '../../cook/lookup';
import { CLASSIC_COUNTRIES, type CookFilters } from '../../prefs';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { nextId } from '../fields';

const t = strings.cook;
const countries = strings.classics.countries;

const entry = (row: ClassicRow): HTMLElement => {
  const item = el('li', 'classic-entry');
  item.dataset.key = row.key;
  item.dataset.id = row.id;
  const link = el('a', 'entry-row row-link classic-found-link');
  link.href = row.href;
  const head = el('span', 'classic-head');
  head.append(
    el('span', 'entry-name', row.name),
    el(
      'span',
      'entry-meta classic-kind',
      `${countries[row.country]}${row.vegetarian ? ` · ${t.withoutMeatMark}` : ''}`,
    ),
    el('span', 'entry-meta classic-status', row.status),
  );
  const note = (className: string, text: string): HTMLElement =>
    el('span', `entry-meta classic-note ${className}`, text);
  link.append(head, note('classic-reason', row.reason));
  if (row.lacks.length > 0)
    link.append(note('classic-lacks', `${t.needsHeading}: ${row.lacks.join(', ')}`));
  for (const text of row.substitutions) link.append(note('classic-substitution', text));
  for (const text of row.unknown) link.append(note('classic-unknown', text));
  if (row.notInCatalogue.length > 0)
    link.append(note('classic-uncatalogued', t.notInCatalogue(row.notInCatalogue.join(', '))));
  item.append(link);
  return item;
};

const field = (label: string, select: HTMLSelectElement): HTMLElement => {
  select.id = nextId('classic-filter');
  const text = el('label', 'field-label', label);
  text.htmlFor = select.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(text, select);
  return wrap;
};

export interface ClassicsSection {
  element: HTMLElement;
  /** Draws the list for the filters; draws again when the catalogue has loaded. */
  draw(filters: CookFilters): void;
}

/**
 * @param filters - The kept filters; the section changes only the country and the meat choice.
 * @param onChange - Called with the filters after a change of the section's own controls.
 */
export const classicsSection = (
  filters: CookFilters,
  onChange: (next: CookFilters) => void,
): ClassicsSection => {
  const section = el('section', 'cook-classics');
  const country = el('select', 'field cook-country');
  const any = el('option', undefined, t.countryAny);
  any.value = '';
  country.append(
    any,
    ...CLASSIC_COUNTRIES.map((c) => {
      const option = el('option', undefined, countries[c]);
      option.value = c;
      return option;
    }),
  );
  country.value = filters.country ?? '';
  const meat = el('select', 'field cook-meat');
  for (const [value, label] of [
    ['', t.meatAny],
    ['free', t.meatFree],
  ] as const) {
    const option = el('option', undefined, label);
    option.value = value;
    meat.append(option);
  }
  meat.value = filters.meatFree === true ? 'free' : '';
  const group = el('div', 'cook-filters classic-filters');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t.classicsFiltersLabel);
  group.append(field(t.countryLabel, country), field(t.meatLabel, meat));
  const results = el('div', 'cook-classic-results');
  section.append(
    el('h2', 'cook-classics-heading', t.classicsHeading),
    el('p', 'muted', t.classicsIntro),
    group,
    results,
  );

  let current = filters;
  const read = (): CookFilters => {
    return {
      lacking: current.lacking,
      ...(current.role === undefined ? {} : { role: current.role }),
      ...(country.value === ''
        ? {}
        : { country: country.value as NonNullable<CookFilters['country']> }),
      ...(meat.value === 'free' ? { meatFree: true as const } : {}),
    };
  };
  const draw = (next: CookFilters): void => {
    current = next;
    const source = notebookSource();
    const found = findClassics(
      shippedClassics(),
      source,
      catalogueEntries(),
      cookToday(),
      next,
      currentLang(),
    );
    if (!found.ok) return results.replaceChildren(el('p', 'note-quiet', t.problem));
    const look = classicLookup(found.ingredients, lookupOf(source), currentLang());
    const rows = (list: typeof found.shown): HTMLElement => {
      const ul = el('ul', 'rows classic-list-found');
      ul.append(...list.map((c) => entry(classicRow(c, look))));
      return ul;
    };
    if (found.shown.length > 0) {
      const list = rows(found.shown);
      list.setAttribute('aria-label', t.classicsListLabel);
      return results.replaceChildren(list);
    }
    const empty = el('div', 'classic-empty');
    empty.append(
      el('p', 'empty', source.stock.length === 0 ? t.classicsEmptyNothingTicked : t.classicsEmpty),
    );
    if (found.nearest.length > 0) {
      const list = el('ul', 'rows classic-nearest');
      for (const candidate of found.nearest) {
        const row = classicRow(candidate, look);
        const item = el('li');
        const a = el('a', 'entry-row row-link classic-found-link');
        a.href = row.href;
        a.append(
          el('span', 'entry-name', t.classicsNearest(row.name, row.lacks.join(', '))),
          el('span', 'entry-meta classic-reason', row.reason),
        );
        item.append(a);
        list.append(item);
      }
      empty.append(el('h3', 'classic-nearest-heading', t.classicsNearestHeading), list);
    }
    results.replaceChildren(empty);
  };
  const change = (): void => {
    const next = read();
    onChange(next);
    draw(next);
  };
  country.addEventListener('change', change);
  meat.addEventListener('change', change);
  return {
    element: section,
    draw: (next) => {
      draw(next);
      // The catalogue completes the tree and the names; draw again once it is there.
      void loadNames().then(() => draw(current));
    },
  };
};
