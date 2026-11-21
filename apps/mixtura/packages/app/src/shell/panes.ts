import { h } from '../dom';
import { type ScreenView } from '../screen';
import { keepFocusVisible } from './keep-focus-visible';

/**
 * The pane or panes of a screen view: one detail pane, plus a list pane for two-pane screens.
 * The page's title, back and actions are in the shared header above (shell/frame.ts); a pane is
 * content only.
 */
export function panes(view: ScreenView): HTMLElement {
  const scroll = h('div', { class: 'pane-scroll' }, view.body);
  keepFocusVisible(scroll);
  const detail = h(
    'section',
    { class: `pane ${view.list ? 'detail' : 'solo detail'}`, 'aria-label': view.title },
    scroll,
    view.actions && h('div', { class: 'actionbar' }, view.actions),
  );
  if (!view.list) return h('main', { class: 'panes' }, detail);
  const list = h(
    'section',
    { class: 'pane list', 'aria-label': view.list.title },
    h('div', { class: 'pane-scroll' }, view.list.body),
  );
  return h('main', { class: 'panes', 'data-phone': view.list.phone }, list, detail);
}
