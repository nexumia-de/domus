// A value the user copies by hand or with a button: a read-only field, the
// Copy button and what the last copy did. The clipboard may be refused; the
// field stays selectable then.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { syncStrings } from './strings';

const t = syncStrings.share;

/** What each Copy button did last, by id; reset when a sheet opens. */
const notes = new Map<string, 'copied' | 'failed'>();

export const resetCopies = (): void => notes.clear();

export function copyRow(
  context: ScreenContext,
  id: string,
  label: string,
  value: string,
  mono = false,
): HTMLElement {
  const note = notes.get(id);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      notes.set(id, 'copied');
    } catch {
      notes.set(id, 'failed');
    }
    context.store.set({ syncViewRev: context.store.get().syncViewRev + 1 });
  };
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h(
      'div',
      { class: 'field-with-button' },
      h('input', {
        type: 'text',
        class: `input${mono ? ' input--mono' : ''}`,
        id,
        name: id,
        readonly: '',
        value,
        autocomplete: 'off',
        spellcheck: 'false',
        'data-testid': id,
        'data-focus': id,
        onfocus: (event) => (event.target as HTMLInputElement).select(),
      }),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--tonal',
          'aria-label': t.copyAria(label),
          'data-focus': `${id}-copy`,
          onclick: () => void copy(),
        },
        t.copy,
      ),
    ),
    note &&
      h(
        'span',
        { class: 'hint', role: 'status', 'data-testid': `${id}-note` },
        note === 'copied' ? t.copied : t.copyFailed,
      ),
  );
}
