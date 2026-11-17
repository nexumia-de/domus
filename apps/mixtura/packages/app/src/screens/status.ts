import { h } from '../dom';

/** A centred status block; the button is a link (`href`) or an action (`onclick`). */
export function status(
  text: string,
  button?: { label: string; href: string } | { label: string; onclick: () => void },
): HTMLElement {
  return h(
    'div',
    { class: 'status' },
    h('p', {}, text),
    button &&
      ('href' in button
        ? h('a', { class: 'btn btn--primary', href: button.href }, button.label)
        : h(
            'button',
            { class: 'btn btn--primary', type: 'button', onclick: button.onclick },
            button.label,
          )),
  );
}
