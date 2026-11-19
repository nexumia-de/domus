// "Start from one ingredient": the ingredients that are ticked, and a search over the notebook's
// ingredients by every name they have (English and German). Choosing one opens
// #/cook/<id>/with, so the back button returns to the list.
import type { IngredientRecord } from '../../records';
import { hashFor } from '../../router';
import { appLang } from '../../shared/locale';
import { displayName, foundThrough, matchesAnyName } from '../../shared/names';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { nextId } from '../fields';

const t = strings.cook;
const MAX_FOUND = 8;

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || (a.name < b.name ? -1 : 1);

const links = (label: string, items: readonly { id: string; name: string; note?: string }[]) => {
  const list = el('ul', 'rows cook-picks');
  list.setAttribute('aria-label', label);
  for (const i of items) {
    const item = el('li');
    const a = el('a', 'row-link cook-pick', i.name);
    a.href = hashFor('cook', i.id, 'with');
    if (i.note !== undefined) a.append(el('span', 'entry-meta', i.note));
    item.append(a);
    list.append(item);
  }
  return list;
};

/**
 * @param ingredients - The notebook's ingredients.
 * @param ticked - The ids of the ingredients with a stock item.
 */
export const startSection = (
  ingredients: readonly IngredientRecord[],
  ticked: ReadonlySet<string>,
  open: boolean,
): HTMLElement => {
  const details = el('details', 'guidance cook-start');
  details.open = open;
  details.append(el('summary', undefined, t.startSummary), el('p', 'muted', t.startHint));

  details.append(el('h2', 'cook-start-heading', t.startStock));
  const stocked = ingredients.filter((i) => ticked.has(i.id)).sort(byName);
  if (stocked.length === 0) details.append(el('p', 'muted', t.startNoStock));
  else
    details.append(
      links(
        t.startStock,
        stocked.map((i) => ({ id: i.id, name: displayName(i, appLang) })),
      ),
    );

  const search = el('input', 'field');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.id = nextId('cook-start');
  const label = el('label', 'field-label', t.startSearchLabel);
  label.htmlFor = search.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(label, search);
  const found = el('div', 'cook-found');
  search.addEventListener('input', () => {
    const text = search.value;
    const hits = text.trim() === '' ? [] : ingredients.filter((i) => matchesAnyName(i, text));
    if (text.trim() === '') return found.replaceChildren();
    if (hits.length === 0) return found.replaceChildren(el('p', 'muted', t.startNone));
    found.replaceChildren(
      links(
        t.startFound,
        hits
          .sort(byName)
          .slice(0, MAX_FOUND)
          .map((i) => {
            const through = foundThrough(i, text);
            return {
              id: i.id,
              name: displayName(i, appLang),
              ...(through && through.name !== displayName(i, appLang)
                ? { note: t.startFoundThrough(through.name) }
                : {}),
            };
          }),
      ),
    );
  });
  details.append(wrap, found);
  return details;
};
