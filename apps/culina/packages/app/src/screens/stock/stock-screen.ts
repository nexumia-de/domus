// The Stock screen: what is there, the nearest use-by first, then by name. Rows show only the
// detail that was entered; remaining days are plain words, never colour. Remove acts at once
// with the toast and Undo.
import { listStock, removeStockItem, restoreStock, stockUnavailable, today } from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { stockRows, type StockRow } from '../../stock/rows';
import { strings } from '../../strings';
import { cookTabs } from '../cook/tabs';
import { storeText } from '../editor/store-text';
import { stockLookup } from './lookup';
import { stockSpaceSection } from './stock-space';

const t = strings.stock;

/** Removes the item and offers Undo; true when it was removed. */
export const removeWithUndo = async (
  id: string,
  name: string,
  message: string,
): Promise<boolean> => {
  const done = await removeStockItem(id);
  if (!done.ok) {
    showToast(storeText(done.error.code));
    return false;
  }
  const removed = done.removed;
  showToast(message, {
    label: t.undo,
    run() {
      void restoreStock(removed).then((back) =>
        showToast(back.ok ? t.restored(name) : storeText(back.error.code)),
      );
    },
  });
  return true;
};

const row = (r: StockRow): HTMLElement => {
  const item = el('li', 'stock-row');
  const link = el('a', 'entry-row row-link stock-link');
  link.href = hashFor('stock', r.id, 'edit');
  link.append(el('span', 'entry-name', r.name));
  const meta = [...r.detail, ...(r.always ? [t.always] : [])];
  if (meta.length > 0) link.append(el('span', 'entry-meta', meta.join(' · ')));
  if (r.remaining !== undefined) link.append(el('span', 'entry-meta stock-remaining', r.remaining));
  const remove = el('button', 'btn quiet stock-remove', t.remove);
  remove.type = 'button';
  remove.setAttribute('aria-label', t.removeLabel(r.name));
  remove.addEventListener('click', () => void removeWithUndo(r.id, r.name, t.removed(r.name)));
  item.append(link, remove);
  return item;
};

export const stockScreen = (): HTMLElement => {
  const section = el('section', 'screen stock-screen');
  section.append(el('h1', undefined, t.title), cookTabs('stock'));
  // Stock lives in the database all apps share, not in the notebook's own store.
  if (stockUnavailable()) {
    section.append(el('p', 'note-quiet', t.unavailable));
  } else {
    const add = el('a', 'btn primary new-link', t.add);
    add.href = hashFor('stock', undefined, 'add');
    section.append(add);
  }
  const rows = stockRows(listStock(), today(), stockLookup);
  if (rows.length === 0) section.append(el('p', 'empty', t.empty));
  else {
    const list = el('ul', 'rows stock-rows');
    list.setAttribute('aria-label', t.listLabel);
    list.append(...rows.map(row));
    section.append(list);
  }
  const space = stockSpaceSection();
  if (space !== undefined) section.append(space);
  const guidance = el('details', 'guidance');
  guidance.append(el('summary', undefined, t.guidanceSummary), el('p', undefined, t.guidance));
  section.append(guidance);
  return section;
};
