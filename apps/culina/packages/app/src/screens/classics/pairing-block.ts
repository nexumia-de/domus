// "Goes with" on the dish screen of either origin, closed behind a tap like the nutrition: the
// ingredients that stand out with those of the dish, computed from shared flavour molecules
// (docs/decisions/flavordb.md). The data is loaded when the section is first opened, not before.
// The wording says what was computed and never that something is right.
import { catalogueEntries, ingredientLabel } from '../../classics/names';
import { currentLang } from '../../classics/lang';
import { getIngredient } from '../../notebook';
import { loadPairings, type LoadedPairings } from '../../pairing/load';
import { pairingView, type PairingLine } from '../../pairing/view';
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

  const show = (): void => {
    if (!element.open) return;
    if (loaded === undefined) {
      body.replaceChildren(el('p', 'muted', asked ? t.notLoaded : t.loading));
      return;
    }
    const lang = currentLang();
    const view = pairingView(lines, loaded, {
      parentOf: (id) => (getIngredient(id) ?? catalogueEntries().get(id))?.parentId,
      nameOf: (id) => ingredientLabel(id, lang),
    });
    if (view.kind !== 'rows') {
      body.replaceChildren(el('p', undefined, view.kind === 'unknown' ? t.unknown : t.none));
      return;
    }
    const list = el('ul', 'pairing-list');
    list.setAttribute('aria-label', t.listLabel);
    for (const row of view.rows) {
      const item = el('li', 'pairing-row');
      item.dataset['ingredient'] = row.ingredient;
      item.append(el('span', 'pairing-name', row.name));
      if (row.with.length > 0)
        item.append(el('span', 'muted pairing-with', t.rowWith(row.with.join(', '))));
      list.append(item);
    }
    body.replaceChildren(
      el('p', 'muted', t.intro),
      list,
      el('p', 'muted', t.hint),
      el('p', 'muted', t.limits),
      el('p', 'muted', `${t.source} ${t.links}`),
    );
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
