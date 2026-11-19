// Quick entry, #/stock/add: a list to tick from, the notebook's ingredients and components first,
// the catalogue by search below (the picker's catalogue section, which copies an entry and its
// parent chain into the notebook). Many ticks in a row; each is saved at once. A tick says only
// that the thing is there; "Always there" is a choice per item.
import type { ComponentRef } from '@culina/engine';
import {
  listComponents,
  listIngredients,
  restoreStock,
  saveStockItem,
  stockName,
  stockOf,
  subscribe,
  tick,
  untick,
} from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { candidates, type Candidate } from '../../stock/candidates';
import { strings } from '../../strings';
import { nextId } from '../fields';
import { catalogueSection } from '../editor/catalogue-section';
import { storeText } from '../editor/store-text';

const t = strings.stock;

const toggleAlways = async (ref: ComponentRef): Promise<void> => {
  const [item] = stockOf(ref);
  if (item === undefined) return;
  const next = { ...item };
  if (item.always === true) delete next.always;
  else next.always = true;
  const done = await saveStockItem(next);
  if (!done.ok) showToast(storeText(done.error.code));
};

export const stockAddScreen = (): HTMLElement => {
  const section = el('section', 'screen stock-add');
  const back = el('a', 'btn quiet new-link', t.back);
  back.href = hashFor('stock');
  section.append(el('h1', undefined, t.addTitle), back);

  const search = el('input', 'field');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.id = nextId('stock-search');
  const label = el('label', 'field-label', t.searchLabel);
  label.htmlFor = search.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(label, search);
  const list = el('ul', 'rows stock-picks');
  const quiet = el('p', 'picker-empty');
  const catalogue = catalogueSection(
    () => search.value,
    (ref) => void tick(ref).then(() => offerUndo(ref)),
  );

  const offerUndo = (ref: ComponentRef): void => {
    const name = stockName({ ref }) ?? '';
    showToast(t.ticked(name), {
      label: t.undo,
      run: () => void untick(ref),
    });
  };

  const pick = (c: Candidate): HTMLElement => {
    const item = el('li', 'stock-pick');
    const there = stockOf(c.ref);
    const ticked = there.length > 0;
    const box = el('button', 'entry-row row-link picker-choice stock-tick');
    box.type = 'button';
    box.setAttribute('role', 'checkbox');
    box.setAttribute('aria-checked', String(ticked));
    const mark = el('span', 'stock-mark', ticked ? '✓' : '');
    mark.setAttribute('aria-hidden', 'true');
    box.append(mark, el('span', 'entry-name', c.name));
    if (c.ref.kind === 'component') box.append(el('span', 'entry-meta', t.component));
    box.addEventListener('click', () => {
      if (ticked) {
        void untick(c.ref).then((done) => {
          if (!done.ok) return showToast(storeText(done.error.code));
          showToast(t.unticked(c.name), {
            label: t.undo,
            run: () => void restoreStock(done.removed),
          });
        });
      } else void tick(c.ref);
    });
    item.append(box);
    if (ticked) {
      const always = el('button', 'btn quiet stock-always', t.alwaysOn);
      always.type = 'button';
      always.setAttribute('aria-pressed', String(there.some((s) => s.always === true)));
      always.setAttribute('aria-label', t.alwaysLabel(c.name));
      always.addEventListener('click', () => void toggleAlways(c.ref));
      item.append(always);
    }
    return item;
  };

  const draw = (): void => {
    list.replaceChildren();
    quiet.textContent = '';
    const shown = candidates(listIngredients(), listComponents(), search.value);
    list.append(...shown.map(pick));
    list.hidden = shown.length === 0;
    if (shown.length === 0) {
      const own = listIngredients().length + listComponents().length;
      quiet.textContent = own === 0 ? t.yourEmpty : t.yourNone;
    }
    catalogue.update();
  };

  search.addEventListener('input', draw);
  const stop = subscribe(() => (section.isConnected ? draw() : stop()));
  section.append(
    wrap,
    el('p', 'note-quiet', t.searchHint),
    el('h2', 'picker-heading', t.yourHeading),
    list,
    quiet,
    catalogue.node,
  );
  draw();
  return section;
};
