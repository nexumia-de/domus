// The picker's section "From the catalogue": entries of the shipped catalogue that match the
// search text and are not in the notebook yet. Loading and a failed load are quiet lines.
import type { ComponentRef } from '@culina/engine';
import { adoptEntry } from '../../catalogue/adopt';
import { loadCatalogue } from '../../catalogue/load';
import { getIngredient } from '../../notebook';
import type { IngredientRecord } from '../../records';
import { filterByName } from '../../shared/search';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from './store-text';

const t = strings.editor;
/** How many matches are listed at once; the rest is reached by typing more. */
export const CATALOGUE_LIMIT = 25;

const meta = (entry: IngredientRecord): string =>
  entry.densityGPerMl && entry.unitWeightG
    ? t.catalogueBoth
    : entry.densityGPerMl
      ? t.catalogueVolume
      : t.cataloguePiece;

export interface CatalogueSection {
  node: HTMLElement;
  /** Draws the section again for the current search text. */
  update(): void;
}

export const catalogueSection = (
  query: () => string,
  onPick: (ref: ComponentRef) => void,
): CatalogueSection => {
  const node = el('section', 'picker-catalogue');
  const body = el('div', 'picker-catalogue-body');
  const heading = el('h3', 'picker-heading', t.catalogueHeading);
  node.append(heading, body);
  let entries: IngredientRecord[] | undefined;
  let state: 'loading' | 'ready' | 'unavailable' = 'loading';
  let problem = '';

  const quiet = (text: string): HTMLElement => el('p', 'picker-empty', text);
  const choose = async (entry: IngredientRecord): Promise<void> => {
    const done = await adoptEntry(entry);
    if (done.ok) onPick(done.ref);
    else {
      problem = storeText(done.error.code);
      update();
    }
  };
  const row = (entry: IngredientRecord): HTMLElement => {
    const item = el('li');
    const button = el('button', 'entry-row row-link picker-choice');
    button.type = 'button';
    button.append(el('span', 'entry-name', entry.name), el('span', 'entry-meta', meta(entry)));
    button.addEventListener('click', () => void choose(entry));
    item.append(button);
    return item;
  };

  const update = (): void => {
    body.replaceChildren();
    if (state === 'loading') return void body.append(quiet(t.catalogueLoading));
    if (state === 'unavailable' || entries === undefined) {
      return void body.append(quiet(t.catalogueUnavailable));
    }
    if (problem !== '') body.append(el('p', 'hint', problem));
    const needle = query().trim();
    const free = entries.filter((e) => getIngredient(e.id) === undefined);
    if (needle === '') return void body.append(quiet(t.catalogueHint(free.length)));
    const found = filterByName(free, needle);
    if (found.length === 0) return void body.append(quiet(t.catalogueNone));
    const lower = needle.toLowerCase();
    const starts = found.filter((e) => e.name.toLowerCase().startsWith(lower));
    const shown = [...starts, ...found.filter((e) => !starts.includes(e))].slice(
      0,
      CATALOGUE_LIMIT,
    );
    const list = el('ul', 'rows picker-rows');
    list.append(...shown.map(row));
    body.append(list);
    if (found.length > shown.length) {
      body.append(quiet(t.catalogueMore(shown.length, found.length)));
    }
  };

  void loadCatalogue().then((loaded) => {
    entries = loaded;
    state = loaded === undefined ? 'unavailable' : 'ready';
    update();
  });
  update();
  return { node, update };
};
