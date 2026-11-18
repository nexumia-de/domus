// The picker: search over the user's own records and choose one; an ingredient can be created
// on the spot. A component that would close a cycle is shown but cannot be chosen.
import type { ComponentRef } from '@culina/engine';
import { filterByName } from '../../shared/search';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { nextId } from '../fields';
import { button } from './form-bits';
import { ingredientCreate } from './ingredient-create';

export interface PickerItem {
  ref: ComponentRef;
  name: string;
  meta?: string;
  /** Why it cannot be chosen; the item is shown but not offered. */
  blocked?: string;
}

export interface PickerOptions {
  title: string;
  items: readonly PickerItem[];
  /** Offer to create an ingredient from the search text. */
  canCreate: boolean;
  onPick(ref: ComponentRef): void;
  onClose(): void;
}

const t = strings.editor;

export const picker = (options: PickerOptions): HTMLElement => {
  const box = el('section', 'picker');
  const search = el('input', 'field');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.id = nextId('pick');
  const label = el('label', 'field-label', options.title);
  label.htmlFor = search.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(label, search);
  const list = el('ul', 'rows picker-rows');
  const create = el('div', 'picker-create');

  const draw = (): void => {
    list.replaceChildren();
    create.replaceChildren();
    const shown = filterByName(options.items, search.value);
    for (const item of shown) {
      const row = el('li');
      if (item.blocked !== undefined) {
        const blocked = el('span', 'entry-row row-link picker-blocked');
        blocked.append(el('span', 'entry-name', item.name), el('span', 'entry-meta', item.blocked));
        row.append(blocked);
      } else {
        const choose = el('button', 'entry-row row-link picker-choice');
        choose.type = 'button';
        choose.append(el('span', 'entry-name', item.name));
        if (item.meta !== undefined) choose.append(el('span', 'entry-meta', item.meta));
        choose.addEventListener('click', () => options.onPick(item.ref));
        row.append(choose);
      }
      list.append(row);
    }
    if (shown.length === 0) list.append(el('li', 'picker-empty', t.pickerEmpty));
    if (options.canCreate) {
      const name = search.value.trim();
      create.append(
        button(name === '' ? t.pickerCreateEmpty : t.pickerCreate(name), 'quiet', () => {
          create.replaceChildren(ingredientCreate(name, options.onPick, draw));
        }),
      );
    }
  };
  search.addEventListener('input', draw);
  draw();
  box.append(wrap, list, create, button(t.pickerClose, 'quiet', options.onClose));
  return box;
};
