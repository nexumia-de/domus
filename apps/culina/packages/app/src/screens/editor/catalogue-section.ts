// The picker's section "From the catalogue": entries of the shipped catalogue that match the
// search text and are not in the notebook yet, as a tree. A parent comes first with its variants
// below it; a parent that is itself a match shows them collapsed until opened, a parent that is
// only on the way to a matching variant shows them open. Loading and a failed load are quiet lines.
import type { ComponentRef } from '@culina/engine';
import { adoptEntry } from '../../catalogue/adopt';
import { loadCatalogue } from '../../catalogue/load';
import {
  catalogueTree,
  searchTree,
  shortName,
  type CatalogueNode,
  type Found,
} from '../../catalogue/tree';
import { getIngredient } from '../../notebook';
import { appLang } from '../../shared/locale';
import { displayName, foundThrough, startsWithAnyName } from '../../shared/names';
import type { IngredientRecord } from '../../records';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from './store-text';

const t = strings.editor;
/** How many top-level results are listed at once; the rest is reached by typing more. */
export const CATALOGUE_LIMIT = 25;

const meta = (entry: IngredientRecord): string | undefined =>
  entry.densityGPerMl && entry.unitWeightG
    ? t.catalogueBoth
    : entry.densityGPerMl
      ? t.catalogueVolume
      : entry.unitWeightG
        ? t.cataloguePiece
        : undefined;

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
  let roots: CatalogueNode[] = [];
  let byId = new Map<string, IngredientRecord>();
  let state: 'loading' | 'ready' | 'unavailable' = 'loading';
  let problem = '';
  /** What the user opened or closed for the current search text, by id. */
  let toggled = new Map<string, boolean>();
  let toggledFor = '';

  const quiet = (text: string): HTMLElement => el('p', 'picker-empty', text);
  const choose = async (entry: IngredientRecord): Promise<void> => {
    const done = await adoptEntry(entry, byId);
    if (done.ok) onPick(done.ref);
    else {
      problem = storeText(done.error.code);
      update();
    }
  };
  const choice = (entry: IngredientRecord, parent: IngredientRecord | undefined): HTMLElement => {
    const other = foundThrough(entry, query());
    const button = el('button', 'entry-row row-link picker-choice');
    button.type = 'button';
    const about = meta(entry);
    // In German the German name leads when the entry has one, and the English name stands beside
    // it; without one the English name is shown as it is. In English it is the other way round: a
    // name found in another language stands beside the English one.
    const german = appLang === 'de' ? entry.names?.['de']?.name : undefined;
    const shown = german ?? shortName(entry, parent);
    button.append(el('span', 'entry-name', shown));
    const alt = german !== undefined ? entry.name : other?.name;
    if (alt !== undefined && alt !== shown) {
      const note = el('span', 'entry-alt', alt);
      note.lang = german !== undefined ? 'en' : (other?.lang ?? 'en');
      button.append(note);
    }
    if (about !== undefined) button.append(el('span', 'entry-meta', about));
    // A variant shows only what follows its parent's name; the full name is its accessible name.
    if (parent !== undefined || german !== undefined)
      button.setAttribute('aria-label', [german ?? entry.name, about].join(' ').trim());
    button.addEventListener('click', () => void choose(entry));
    return button;
  };

  const row = (found: Found, parent: IngredientRecord | undefined): HTMLElement => {
    const item = el('li', 'picker-node');
    if (found.children.length === 0) {
      item.append(choice(found.entry, parent));
      return item;
    }
    const open = toggled.get(found.entry.id) ?? !found.hit;
    const head = el('div', 'picker-group');
    const toggle = el('button', 'picker-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute(
      'aria-label',
      (open ? t.catalogueHide : t.catalogueShow)(displayName(found.entry, appLang)),
    );
    toggle.append(
      el('span', 'picker-chevron', open ? '▾' : '▸'),
      el('span', 'picker-count', t.catalogueVariants(found.below)),
    );
    toggle.addEventListener('click', () => {
      toggled.set(found.entry.id, !open);
      update();
      // The list is drawn again; the same toggle gets the focus back.
      body.querySelector<HTMLElement>(`[data-toggle="${CSS.escape(found.entry.id)}"]`)?.focus();
    });
    toggle.dataset.toggle = found.entry.id;
    head.append(choice(found.entry, parent), toggle);
    item.append(head);
    if (open) {
      const list = el('ul', 'rows picker-rows picker-children');
      list.append(...found.children.map((child) => row(child, found.entry)));
      item.append(list);
    }
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
    if (needle !== toggledFor) {
      toggled = new Map();
      toggledFor = needle;
    }
    if (needle === '') {
      const free = entries.filter((e) => getIngredient(e.id) === undefined);
      return void body.append(quiet(t.catalogueHint(free.length)));
    }
    const found = searchTree(roots, needle, (e) => getIngredient(e.id) === undefined);
    if (found.length === 0) return void body.append(quiet(t.catalogueNone));
    const starts = found.filter((f) => startsWithAnyName(f.entry, needle));
    const shown = [...starts, ...found.filter((f) => !starts.includes(f))].slice(
      0,
      CATALOGUE_LIMIT,
    );
    const list = el('ul', 'rows picker-rows');
    list.append(...shown.map((f) => row(f, undefined)));
    body.append(list);
    if (found.length > shown.length) {
      body.append(quiet(t.catalogueMore(shown.length, found.length)));
    }
  };

  void loadCatalogue().then((loaded) => {
    entries = loaded;
    roots = loaded === undefined ? [] : catalogueTree(loaded);
    byId = new Map((loaded ?? []).map((e) => [e.id, e]));
    state = loaded === undefined ? 'unavailable' : 'ready';
    update();
  });
  update();
  return { node, update };
};
