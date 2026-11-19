import { h } from '../dom';
import { type ScreenView } from '../screen';
import { strings } from '../strings';

/** Unknown route: a status page with a way back, never an empty screen. */
export function notFound(): ScreenView {
  return {
    title: strings.titles.notFound,
    body: h(
      'div',
      { class: 'status' },
      h('h2', {}, strings.notFound.title),
      h('p', {}, strings.notFound.text),
      h('a', { class: 'btn btn--primary', href: '#/drinks' }, strings.buttons.openDrinks),
    ),
  };
}
