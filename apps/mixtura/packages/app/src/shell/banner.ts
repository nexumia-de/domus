import { type AppState } from '../app-state';
import { h } from '../dom';
import { strings } from '../strings';

/** Non-blocking "Update available" line; the reload happens only on the tap. */
export function updateBanner(state: AppState, onUpdate: () => void): HTMLElement | null {
  if (state.update !== 'available') return null;
  return h(
    'div',
    { class: 'banner', role: 'status' },
    h('span', {}, strings.update.available),
    h(
      'button',
      { class: 'btn btn--tonal', type: 'button', 'data-focus': 'update', onclick: onUpdate },
      strings.update.action,
    ),
  );
}
