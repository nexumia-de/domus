import { h } from '../dom';
import { icon } from '../dom';
import { strings } from '../strings';
import { type ScreenView } from '../screen';

function appbar(title: string, onBack?: () => void): HTMLElement {
  return h(
    'header',
    { class: 'appbar' },
    onBack &&
      h(
        'button',
        {
          class: 'btn btn--icon',
          type: 'button',
          'aria-label': strings.back,
          title: strings.back,
          'data-focus': 'back',
          onclick: onBack,
        },
        icon([['path', { d: 'M15 5l-7 7 7 7' }]]),
      ),
    h('h1', {}, title),
  );
}

/** The pane or panes of a screen view: one detail pane, plus a list pane for two-pane screens. */
export function panes(view: ScreenView, pushed: boolean, onBack: () => void): HTMLElement {
  const back = pushed ? onBack : undefined;
  const detail = h(
    'section',
    { class: `pane ${view.list ? 'detail' : 'solo detail'}`, 'aria-label': view.title },
    appbar(view.title, back),
    h('div', { class: 'pane-scroll' }, view.body),
    view.actions && h('div', { class: 'actionbar' }, view.actions),
  );
  if (!view.list) return h('main', { class: 'panes' }, detail);
  const list = h(
    'section',
    { class: 'pane list', 'aria-label': view.list.title },
    appbar(view.list.title),
    h('div', { class: 'pane-scroll' }, view.list.body),
  );
  return h('main', { class: 'panes', 'data-phone': view.list.phone }, list, detail);
}
