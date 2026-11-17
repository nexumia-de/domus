import { type AppState } from '../app-state';
import { h } from '../dom';
import { strings } from '../strings';

/** The toast: a status line above the navigation, with Undo when the action has one. */
export function toast(state: AppState, close: () => void): HTMLElement | null {
  const t = state.toast;
  if (!t) return null;
  const { undo } = t;
  return h(
    'div',
    { class: 'toast', role: 'status', 'data-testid': 'toast' },
    h('span', {}, t.text),
    undo &&
      h(
        'button',
        {
          class: 'btn btn--tonal',
          type: 'button',
          'data-focus': 'toast-undo',
          onclick: () => {
            close();
            undo();
          },
        },
        strings.data.undo,
      ),
  );
}
