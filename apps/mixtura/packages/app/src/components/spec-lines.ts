// The ingredient lines of a spec and its fixed rows (method, glass,
// garnish); absent fields are left out, not shown empty. Lines are not
// tappable outside swap mode (docs/screens-browse.md#spec). The role is a
// tag with its word, never a colour.

import { h } from '../dom';
import { strings } from '../strings';
import type { LineVM } from '../screens/spec/view-model';

function line(vm: LineVM): HTMLElement {
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
  );
}

export function specLines(lines: readonly LineVM[]): HTMLElement {
  return h('div', { role: 'list', 'aria-label': strings.spec.ingredients }, ...lines.map(line));
}

export function specMeta(meta: readonly { label: string; value: string }[]): HTMLElement | null {
  if (meta.length === 0) return null;
  return h(
    'dl',
    { class: 'meta' },
    ...meta.flatMap((row) => [h('dt', {}, row.label), h('dd', {}, row.value)]),
  );
}
