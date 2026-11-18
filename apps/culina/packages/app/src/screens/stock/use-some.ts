// "Use some": subtract an amount used from the amount in stock, in any unit that converts. What is
// left is saved at once; using all of it removes the item with the toast and Undo.
import { useAmount } from '@culina/engine';
import type { Amount, UnitId } from '@culina/engine';
import { AMOUNT_UNITS } from '../../editor/units';
import { factsByIngredient, getStockItem, saveStockItem } from '../../notebook';
import { hashFor } from '../../router';
import { parseEntry } from '../../shared/parse';
import { el } from '../../shell/el';
import { amountText } from '../../stock/rows';
import { strings } from '../../strings';
import { bareSelect, button, mark, textField } from '../editor/form-bits';
import { storeText } from '../editor/store-text';
import { removeWithUndo } from './stock-screen';

const t = strings.stock;

/** The section, or undefined for an item with no amount (there is nothing to subtract from). */
export const useSome = (
  id: string,
  name: string,
  onLeft: (left: Amount | undefined) => void,
): HTMLElement | undefined => {
  const item = getStockItem(id);
  if (item?.amount === undefined) return undefined;
  const box = el('section', 'stock-use');
  const inStock = el('p', 'note-quiet', t.useHint(amountText(item.amount)));
  const used = textField(t.useLabel, '', true);
  const unit = bareSelect(
    t.unitLabel,
    AMOUNT_UNITS.map((u) => ({ value: u, label: u })),
    item.amount.unit,
  );
  const row = el('div', 'line-amount');
  row.append(used.wrap, unit);
  const status = el('p', 'hint');
  status.setAttribute('role', 'status');

  const subtract = async (): Promise<void> => {
    const now = getStockItem(id);
    if (now?.amount === undefined) return;
    const entry = parseEntry(used.control.value);
    mark(used.control, entry.kind !== 'ok');
    if (entry.kind !== 'ok') {
      status.textContent = t.useNotNumber;
      return;
    }
    const facts = now.ref.kind === 'ingredient' ? factsByIngredient()[now.ref.id] : undefined;
    const result = useAmount(now.amount, { value: entry.value, unit: unit.value as UnitId }, facts);
    if (!result.ok) {
      status.textContent = t.useCannot;
      return;
    }
    if (result.usedUp) {
      if (await removeWithUndo(id, name, t.usedUp(name))) window.location.hash = hashFor('stock');
      return;
    }
    const done = await saveStockItem({ ...now, amount: result.amount });
    if (!done.ok) {
      status.textContent = storeText(done.error.code);
      return;
    }
    used.control.value = '';
    inStock.textContent = t.useHint(amountText(result.amount));
    status.textContent = t.left(amountText(result.amount));
    onLeft(result.amount);
  };

  box.append(
    el('h2', undefined, t.useHeading),
    inStock,
    row,
    status,
    button(t.useButton, '', () => void subtract()),
  );
  return box;
};
