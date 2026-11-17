import { h } from '../dom';

/** A centred status block, shared by the placeholder screens. */
export function status(text: string, button?: { label: string; href: string }): HTMLElement {
  return h(
    'div',
    { class: 'status' },
    h('p', {}, text),
    button && h('a', { class: 'btn btn--primary', href: button.href }, button.label),
  );
}
