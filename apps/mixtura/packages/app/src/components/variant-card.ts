// The variant suggestions of the spec screen (#37): what a variant replaces
// and keeps, and the button that opens the editor on it. Plain words; nothing
// says the variant tastes the same.

import { h } from '../dom';
import type { VariantVM } from '../screens/spec/variant-vm';
import { variantStrings as t } from '../screens/spec/variant-strings';

export function variantCard(
  vm: { template?: string; items: VariantVM[] } | undefined,
): HTMLElement | null {
  if (!vm || vm.items.length === 0) return null;
  return h(
    'section',
    { class: 'card variant-card', 'aria-labelledby': 'variants-title', 'data-variants': '' },
    h('h2', { id: 'variants-title' }, t.title),
    vm.template && h('p', { class: 'note' }, t.intro(vm.template)),
    ...vm.items.map((item) =>
      h(
        'div',
        { class: 'variant', 'data-variant': item.templateId },
        h('p', { class: 'variant-changes' }, ...item.changes.map((c) => h('span', {}, c))),
        item.evidence && h('p', { class: 'note' }, item.evidence),
        h(
          'a',
          {
            class: 'btn btn--tonal',
            href: item.href,
            'aria-label': item.buttonAria,
            'data-action': 'start-variant',
          },
          item.button,
        ),
      ),
    ),
  );
}
