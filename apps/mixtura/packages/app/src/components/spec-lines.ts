// The ingredient lines of a spec and its fixed rows (method, glass,
// garnish); absent fields are left out, not shown empty. Lines are not
// tappable outside swap mode (docs/screens-browse.md#spec). The role is a
// tag with its word, never a colour.

import { h } from '../dom';
import { strings } from '../strings';
import type { LineVM } from '../screens/spec/view-model';

export interface LineActions {
  /** Opens (index) or closes (null) the volume field of a top line. */
  editTop(index: number | null): void;
  /** Sets the what-if volume from typed text; false when the text is not a volume. */
  setTop(index: number, text: string): boolean;
  clearTop(index: number): void;
}

function topControls(vm: LineVM, actions: LineActions): Node | null {
  const top = vm.top;
  if (!top || top.state === 'stored') return null;
  if (!top.editing) {
    return h(
      'span',
      { class: 'line-volume' },
      top.state === 'what-if' && h('span', { class: 'line-note' }, strings.spec.whatIf),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--text',
          'aria-label': top.state === 'what-if' ? strings.spec.changeVolumeAria : undefined,
          onclick: () => actions.editTop(vm.index),
        },
        top.state === 'what-if' ? strings.spec.changeVolume : strings.spec.addVolume,
      ),
      top.state === 'what-if' &&
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--text',
            'aria-label': strings.spec.clearVolumeAria,
            onclick: () => actions.clearTop(vm.index),
          },
          strings.spec.clearVolume,
        ),
    );
  }
  const input = h('input', {
    type: 'text',
    inputmode: 'decimal',
    class: 'input',
    id: `top-ml-${vm.index}`,
    'data-focus': 'top-ml',
    'aria-label': strings.spec.volumeField,
    'aria-describedby': `top-hint-${vm.index}`,
    value: top.fieldValue,
    autocomplete: 'off',
  });
  const error = h(
    'span',
    { class: 'note', role: 'alert', id: `top-hint-${vm.index}` },
    strings.spec.volumeHint,
  );
  const submit = (): void => {
    if (!actions.setTop(vm.index, input.value)) error.textContent = strings.spec.volumeInvalid;
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') actions.editTop(null);
  });
  return h(
    'span',
    { class: 'line-volume line-volume--open' },
    h(
      'span',
      { class: 'line-volume-row' },
      input,
      h(
        'button',
        { type: 'button', class: 'btn btn--primary', onclick: submit },
        strings.spec.setVolume,
      ),
      h(
        'button',
        { type: 'button', class: 'btn btn--text', onclick: () => actions.editTop(null) },
        strings.spec.cancel,
      ),
    ),
    error,
  );
}

function line(vm: LineVM, actions: LineActions): HTMLElement {
  return h(
    'div',
    { class: 'line', role: 'listitem' },
    h('span', { class: 'line-amount num' }, vm.amount),
    h(
      'span',
      { class: 'line-main' },
      h('span', { class: vm.known ? 'line-name' : 'line-name line-name--unknown' }, vm.name),
      vm.optional && h('span', { class: 'line-optional' }, ` (${strings.spec.optional})`),
      vm.note && h('span', { class: 'line-note' }, vm.note),
      ...vm.substitutes.map((text) => h('span', { class: 'line-note' }, text)),
      vm.prepared &&
        h(
          'a',
          {
            class: 'line-link',
            href: vm.prepared.href,
            'aria-label': strings.spec.openPrepared(vm.prepared.name),
          },
          `${strings.spec.prepared}: ${vm.prepared.name}`,
        ),
    ),
    vm.role && h('span', { class: 'tag', 'data-role': vm.role.id }, vm.role.label),
    topControls(vm, actions),
  );
}

export function specLines(lines: readonly LineVM[], actions: LineActions): HTMLElement {
  return h(
    'div',
    { role: 'list', 'aria-label': strings.spec.ingredients },
    ...lines.map((vm) => line(vm, actions)),
  );
}

export function specMeta(meta: readonly { label: string; value: string }[]): HTMLElement | null {
  if (meta.length === 0) return null;
  return h(
    'dl',
    { class: 'meta' },
    ...meta.flatMap((row) => [h('dt', {}, row.label), h('dd', {}, row.value)]),
  );
}
