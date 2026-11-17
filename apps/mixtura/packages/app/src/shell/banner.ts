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

const reasons: Record<string, string> = {
  unavailable: strings.storage.reasons.unavailable,
  blocked: strings.storage.reasons.blocked,
  stale: strings.storage.reasons.stale,
  'too-new': strings.storage.reasons.tooNew,
  migration: strings.storage.reasons.migration,
  quota: strings.storage.reasons.quota,
};

function line(
  title: string,
  text: string,
  onRetry?: () => void,
  action: string = strings.storage.retry,
): HTMLElement {
  return h(
    'div',
    { class: 'banner', role: 'status' },
    h('span', {}, h('strong', {}, `${title} `), text),
    onRetry &&
      h(
        'button',
        { class: 'btn btn--tonal', type: 'button', 'data-focus': 'retry', onclick: onRetry },
        action,
      ),
  );
}

/**
 * The line about the local data, in order of importance: the store cannot
 * be used (the app is read-only), the built-in data did not load, a setting
 * was not saved. Null when all is well.
 */
export function statusBanner(
  state: AppState,
  onRetry: () => void,
  onReload: () => void = () => location.reload(),
): HTMLElement | null {
  const s = strings.storage;
  if (state.storage.kind === 'error') {
    const reason = reasons[state.storage.error] ?? state.storage.reason;
    // Another window upgraded the database: Try Again cannot help, a reload does.
    if (state.storage.error === 'stale') {
      return line(s.title, s.text(reason), onReload, s.reload);
    }
    return line(s.title, s.text(reason), onRetry);
  }
  if (state.seed.kind === 'failed') return line(s.seedTitle, s.seedText, onRetry);
  if (state.saveError) return line(s.notSaved, s.notSavedText(state.saveError));
  return null;
}
