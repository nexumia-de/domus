// One version, read-only, with its own balance figures. "Restore as New
// Version" copies it forward as the next version; nothing earlier changes.

import { balancePanel } from '../../components/balance-panel';
import { specLines, specMeta } from '../../components/spec-lines';
import { h } from '../../dom';
import { type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { drinksPane } from '../drinks/pane';
import type { BrowseModel } from '../browse/model';
import { specVM, type SpecVM, type TagVM } from '../spec/view-model';
import { noVersion } from './common';
import { restore } from './restore';
import { versionStrings as vs } from './strings';

const noActions = {
  editTop: () => undefined,
  setTop: () => false,
  clearTop: () => undefined,
};

function tag(vm: TagVM): HTMLElement {
  return h('span', { class: vm.strong ? 'tag tag--strong' : 'tag' }, vm.text);
}

function body(vm: SpecVM, note: string | undefined, version: number, newest: number): HTMLElement {
  return h(
    'div',
    { class: 'spec spec--version' },
    h(
      'div',
      { class: 'banner version-banner', role: 'status' },
      h('span', {}, vs.readOnly(version, newest)),
    ),
    h('div', { class: 'tags' }, ...vm.tags.map(tag)),
    note && h('p', { class: 'version-note', 'data-version-note': '' }, `${vs.notePrefix}: ${note}`),
    h(
      'div',
      { class: 'two-col' },
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'ingredients-title' },
        h('h2', { id: 'ingredients-title' }, strings.spec.ingredients),
        specLines(vm.lines, noActions),
        specMeta(vm.meta),
      ),
      h('div', { class: 'stack' }, balancePanel(vm.balance)),
    ),
    vm.notes &&
      h(
        'section',
        { class: 'card' },
        h('h2', {}, strings.spec.notes),
        h('p', { class: 'spec-notes' }, vm.notes),
      ),
  );
}

export function versionView(
  context: ScreenContext,
  model: BrowseModel,
  id: string,
  n: number,
): ScreenView {
  const versions = model.versionsOf(id);
  const spec = versions.find((v) => v.version === n);
  const newest = versions.at(-1);
  if (!spec || !newest) return noVersion(context);
  const vm = specVM(model, spec, context.state.units, { origin: 'user' });
  const writable = context.data.local() !== null;
  return {
    title: `${spec.name} · ${vs.versionLine(n)}`,
    body: body(vm, spec.note, n, newest.version),
    actions:
      spec === newest
        ? h(
            'a',
            {
              class: 'btn btn--primary',
              href: `#/drinks/${encodeURIComponent(id)}/edit`,
              'data-focus': 'edit',
            },
            strings.spec.edit,
          )
        : h(
            'button',
            {
              type: 'button',
              class: 'btn btn--primary',
              'data-action': 'restore',
              'data-focus': 'restore',
              disabled: !writable,
              'aria-label': vs.restoreAria(n),
              onclick: () => void restore(context, id, n),
            },
            vs.restore,
          ),
    list: drinksPane(context, 'detail', id),
  };
}
