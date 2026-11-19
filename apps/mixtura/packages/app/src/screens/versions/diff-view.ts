// The diff of two versions: lines as Added, Removed or Changed with a shape
// and a word, the other fields, and the figures with their change in the
// balance panel of Try a Swap. "No differences." when there are none.

import { balancePanel } from '../../components/balance-panel';
import { h } from '../../dom';
import { type ScreenContext, type ScreenView } from '../../screen';
import { drinksPane } from '../drinks/pane';
import type { BrowseModel } from '../browse/model';
import { diffVM, type DiffVM } from './diff-vm';
import { noVersion } from './common';
import { versionStrings as vs } from './strings';

function lineItem(line: DiffVM['lines'][number]): HTMLElement {
  return h(
    'li',
    { class: `diff-line diff-line--${line.kind}`, 'data-diff': line.kind },
    h('span', { class: 'diff-marker', 'aria-hidden': 'true' }, line.marker),
    h('span', { class: 'diff-label' }, line.label),
    h('span', { class: 'diff-text' }, line.text),
  );
}

function body(vm: DiffVM, a: number, b: number): HTMLElement {
  return h(
    'div',
    { class: 'diff' },
    h('h2', { class: 'section-title' }, vs.diffTitle(a, b)),
    vm.empty
      ? h('p', { class: 'note', 'data-diff-empty': '' }, vs.identical)
      : h(
          'section',
          { class: 'card', 'aria-label': vs.diffTitle(a, b) },
          vm.lines.length > 0 && h('ul', { class: 'diff-lines' }, ...vm.lines.map(lineItem)),
          vm.fields.length > 0 &&
            h(
              'ul',
              { class: 'diff-fields' },
              ...vm.fields.map((text) => h('li', { 'data-diff': 'field' }, text)),
            ),
        ),
    h('h2', { class: 'section-title' }, vs.figures),
    h('div', { class: 'stack', 'data-diff-figures': '' }, balancePanel(vm.balance)),
  );
}

export function diffView(
  context: ScreenContext,
  model: BrowseModel,
  id: string,
  a: number,
  b: number,
): ScreenView {
  const versions = model.versionsOf(id);
  const older = versions.find((v) => v.version === Math.min(a, b));
  const newer = versions.find((v) => v.version === Math.max(a, b));
  if (!older || !newer || older === newer) return noVersion(context);
  const vm = diffVM(model, older, newer, context.state.units);
  return {
    title: vs.titleOf(newer.name),
    body: body(vm, older.version, newer.version),
    list: drinksPane(context, 'detail', id),
  };
}
