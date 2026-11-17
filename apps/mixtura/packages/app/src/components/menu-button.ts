// A menu button after the WAI-ARIA Authoring Practices "menu button" pattern,
// with one choice marked (`menuitemradio`): the button opens the menu below
// it, the arrow keys, Home and End move between the items, Escape closes and
// returns to the button, Tab closes and moves on, a tap outside closes. The
// menu is drawn in place, so its open state is not in the address: a redraw
// of the page closes it. Choosing an item hands focus back to the button
// before the page redraws (shell/render.ts restores focus by `data-focus`).

import { h } from '../dom';
import * as glyph from './glyphs';

export interface MenuItem {
  id: string;
  label: string;
  checked: boolean;
}

let counter = 0;

export function menuButton(options: {
  /** Accessible name and tooltip of the button. */
  label: string;
  /** Name of the menu for assistive technology. */
  menuLabel: string;
  focusKey: string;
  icon: Node;
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
}): HTMLElement {
  const id = `menu-${(counter += 1)}`;
  const button = h(
    'button',
    {
      class: 'btn btn--icon',
      type: 'button',
      'aria-label': options.label,
      title: options.label,
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': id,
      'data-focus': options.focusKey,
    },
    options.icon,
  );
  const entries = options.items.map((item) =>
    h(
      'button',
      {
        class: 'menu-item',
        type: 'button',
        role: 'menuitemradio',
        'aria-checked': String(item.checked),
        tabindex: '-1',
        onclick: () => {
          button.focus();
          close(false);
          options.onSelect(item.id);
        },
      },
      h('span', { class: 'menu-check' }, item.checked && glyph.check()),
      item.label,
    ),
  );
  const menu = h(
    'div',
    { class: 'menu', id, role: 'menu', 'aria-label': options.menuLabel, hidden: true },
    ...entries,
  );
  const wrap = h('div', { class: 'menu-wrap' }, button, menu);

  const outside = (event: Event): void => {
    if (!wrap.isConnected) document.removeEventListener('pointerdown', outside, true);
    else if (!wrap.contains(event.target as Node)) close(false);
  };
  function close(refocus: boolean): void {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (refocus) button.focus();
  }
  function open(which: 'checked' | 'first' | 'last'): void {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true);
    const checked = options.items.findIndex((item) => item.checked);
    const index =
      which === 'last' ? entries.length - 1 : which === 'first' ? 0 : Math.max(checked, 0);
    entries[index]?.focus();
  }

  button.addEventListener('click', () => (menu.hidden ? open('checked') : close(true)));
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open(event.key === 'ArrowDown' ? 'first' : 'last');
  });
  menu.addEventListener('keydown', (event) => {
    const at = entries.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number): void => {
      event.preventDefault();
      entries[(to + entries.length) % entries.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        return move(at + 1);
      case 'ArrowUp':
        return move(at - 1);
      case 'Home':
        return move(0);
      case 'End':
        return move(entries.length - 1);
      case 'Escape':
        // The app's Escape would leave the screen.
        event.stopPropagation();
        event.preventDefault();
        return close(true);
      case 'Tab':
        // Focus goes back to the button first, so Tab moves on from there.
        button.focus();
        return close(false);
    }
  });
  return wrap;
}
