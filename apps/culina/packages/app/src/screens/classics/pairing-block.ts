// "Goes with" on the dish screen of either origin, closed behind a tap like the nutrition: the
// ingredients that stand out with those of the dish, computed from shared flavour molecules
// (docs/decisions/flavordb.md). The data is loaded when the section is first opened, not before.
// The wording says what was computed and never that something is right.
import { catalogueEntries, ingredientLabel } from '../../classics/names';
import { currentLang } from '../../classics/lang';
import { getIngredient } from '../../notebook';
import { AFFINITIES, affinityRows } from '../../pairing/affinity';
import { loadPairings, type LoadedPairings } from '../../pairing/load';
import { pairingView, type PairingLine, type PairingRow } from '../../pairing/view';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.pairing;

/** The closed section and the function that tells it the lines of the dish as drawn. */
export const pairingDetails = (
  load: () => Promise<LoadedPairings | undefined> = loadPairings,
): {
  element: HTMLDetailsElement;
  draw: (lines: readonly PairingLine[]) => void;
} => {
  const element = el('details', 'pairing-block foot-block');
  const body = el('div', 'pairing-body');
  element.append(el('summary', undefined, t.heading), body);
  let lines: readonly PairingLine[] = [];
  let loaded: LoadedPairings | undefined;
  let asked = false;

  const rowList = (rows: readonly PairingRow[], label: string, className: string): HTMLElement => {
    const list = el('ul', `pairing-list ${className}`);
    list.setAttribute('aria-label', label);
    for (const row of rows) {
      const item = el('li', 'pairing-row');
      item.dataset['ingredient'] = row.ingredient;
      item.append(el('span', 'pairing-name', row.name));
      if (row.with.length > 0)
        item.append(el('span', 'muted pairing-with', t.rowWith(row.with.join(', '))));
      list.append(item);
    }
    return list;
  };

  const show = (): void => {
    if (!element.open) return;
    const lang = currentLang();
    const names = {
      parentOf: (id: string) => (getIngredient(id) ?? catalogueEntries().get(id))?.parentId,
      nameOf: (id: string) => ingredientLabel(id, lang),
    };
    const parts: HTMLElement[] = [];
    // Proven together: the project's own table, there at once.
    const proven = affinityRows(lines, AFFINITIES, names);
    if (proven.length > 0) {
      parts.push(
        el('h3', 'pairing-sub', t.provenHeading),
        el('p', 'muted', t.provenBasis),
        rowList(proven, t.provenListLabel, 'pairing-proven'),
      );
    }
    parts.push(el('h3', 'pairing-sub', t.computedHeading));
    if (loaded === undefined) {
      parts.push(el('p', 'muted', asked ? t.notLoaded : t.loading));
      body.replaceChildren(...parts);
      return;
    }
    const view = pairingView(lines, loaded, names);
    const above = new Set(proven.map((row) => row.ingredient));
    const rows = view.kind === 'rows' ? view.rows.filter((row) => !above.has(row.ingredient)) : [];
    if (rows.length === 0) {
      parts.push(el('p', undefined, view.kind === 'unknown' ? t.unknown : t.none));
    } else {
      parts.push(
        el('p', 'muted', t.intro),
        rowList(rows, t.listLabel, 'pairing-computed'),
        el('p', 'muted', t.hint),
        el('p', 'muted', t.limits),
        el('p', 'muted', `${t.source} ${t.links}`),
      );
    }
    body.replaceChildren(...parts);
  };

  element.addEventListener('toggle', () => {
    if (!element.open) return;
    show();
    if (loaded !== undefined) return;
    void load().then((result) => {
      loaded = result;
      asked = true;
      show();
    });
  });

  return {
    element,
    draw: (next) => {
      lines = next;
      show();
    },
  };
};
