// "Goes with" while a dish is put together: under the slots, the ingredients of the catalogue
// that stand out with what the draft already holds (docs/decisions/flavordb.md), each a button
// that adds it as a slot. The data is loaded when the draft first has an ingredient, not before.
// The wording says what was computed and never that something is right or missing.
import type { ComponentRef } from '@culina/engine';
import { adoptEntry } from '../../catalogue/adopt';
import { currentLang } from '../../classics/lang';
import { catalogueEntries, ingredientLabel, loadNames } from '../../classics/names';
import { getIngredient } from '../../notebook';
import { AFFINITIES, affinityRows } from '../../pairing/affinity';
import { loadPairings, type LoadedPairings } from '../../pairing/load';
import { pairingView, type PairingLine, type PairingRow } from '../../pairing/view';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from './store-text';

const t = strings.pairing;

export interface PairingSuggest {
  element: HTMLElement;
  /** Draws the section again when the ingredients of the draft have changed. */
  refresh(): void;
}

export const pairingSuggest = (options: {
  /** The ingredients the draft holds now. */
  lines: () => readonly PairingLine[];
  /** Adds the ingredient to the draft as a slot. */
  onAdd(ref: ComponentRef): void;
  load?: () => Promise<LoadedPairings | undefined>;
}): PairingSuggest => {
  const element = el('section', 'pairing-suggest');
  const body = el('div', 'pairing-body');
  element.append(el('h2', undefined, t.heading), body);
  let loaded: LoadedPairings | undefined;
  let state: 'idle' | 'loading' | 'failed' | 'ready' = 'idle';
  let drawnFor: string | undefined;
  let problem = '';

  const add = async (row: PairingRow): Promise<void> => {
    // An ingredient of the notebook is taken as it is; one of the catalogue is copied first.
    if (getIngredient(row.ingredient) !== undefined) {
      options.onAdd({ kind: 'ingredient', id: row.ingredient });
      return;
    }
    const catalogue = await loadNames();
    const entry = catalogue.get(row.ingredient);
    if (entry === undefined) return;
    const done = await adoptEntry(entry, catalogue);
    if (done.ok) options.onAdd(done.ref);
    else {
      problem = storeText(done.error.code);
      drawnFor = undefined;
      refresh();
    }
  };

  const addList = (rows: readonly PairingRow[], label: string, className: string): HTMLElement => {
    const list = el('ul', `pairing-list pairing-adds ${className}`);
    list.setAttribute('aria-label', label);
    for (const row of rows) {
      const item = el('li', 'pairing-row');
      item.dataset['ingredient'] = row.ingredient;
      const button = el('button', 'btn quiet pairing-add');
      button.type = 'button';
      button.setAttribute('aria-label', t.add(row.name));
      button.append(el('span', 'pairing-name', row.name));
      if (row.with.length > 0)
        button.append(el('span', 'muted pairing-with', t.rowWith(row.with.join(', '))));
      button.addEventListener('click', () => void add(row));
      item.append(button);
      list.append(item);
    }
    return list;
  };

  const draw = (lines: readonly PairingLine[]): void => {
    if (lines.length === 0) {
      body.replaceChildren(el('p', 'muted pairing-empty', t.editorEmpty));
      return;
    }
    const lang = currentLang();
    const names = {
      parentOf: (id: string) => (getIngredient(id) ?? catalogueEntries().get(id))?.parentId,
      nameOf: (id: string) => ingredientLabel(id, lang),
    };
    const parts: HTMLElement[] = problem === '' ? [] : [el('p', 'hint', problem)];
    // Proven together: the project's own table, there at once.
    const proven = affinityRows(lines, AFFINITIES, names);
    if (proven.length > 0) {
      parts.push(
        el('h3', 'pairing-sub', t.provenHeading),
        el('p', 'muted', `${t.provenBasis} ${t.tapToAdd}`),
        addList(proven, t.provenListLabel, 'pairing-proven'),
      );
    }
    // From the flavour data: computed, loaded on demand, without what stands above.
    parts.push(el('h3', 'pairing-sub', t.computedHeading));
    if (loaded === undefined) {
      parts.push(el('p', 'muted', state === 'failed' ? t.notLoaded : t.loading));
    } else {
      const view = pairingView(lines, loaded, names);
      const above = new Set(proven.map((row) => row.ingredient));
      const rows =
        view.kind === 'rows' ? view.rows.filter((row) => !above.has(row.ingredient)) : [];
      if (rows.length === 0) {
        parts.push(el('p', 'muted', view.kind === 'unknown' ? t.unknown : t.none));
      } else {
        parts.push(
          el('p', 'muted', t.editorIntro),
          addList(rows, t.listLabel, 'pairing-computed'),
          el('p', 'muted', t.hint),
          el('p', 'muted', `${t.source} ${t.links}`),
        );
      }
    }
    body.replaceChildren(...parts);
  };

  const refresh = (): void => {
    const lines = options.lines();
    if (lines.length > 0 && state === 'idle') {
      state = 'loading';
      void (options.load ?? loadPairings)().then((result) => {
        loaded = result;
        state = result === undefined ? 'failed' : 'ready';
        drawnFor = undefined;
        refresh();
      });
    }
    const key = `${state}|${currentLang()}|${lines.map((l) => `${l.ingredient}=${l.name}`).join('|')}`;
    if (key === drawnFor) return;
    drawnFor = key;
    draw(lines);
    problem = '';
  };

  return { element, refresh };
};
