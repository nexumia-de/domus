// The screen a share link opens (#/share; the payload is taken out of the
// address as soon as it is read, share/watch.ts). It shows the import
// preview for one drink, or one error state; there is never a blank screen
// (docs/screens-specs.md#share-a-drink).

import { importPanel } from '../../components/import-preview';
import { h } from '../../dom';
import { type Screen, type ScreenContext } from '../../screen';
import { addShared, closeShared } from '../../share/open';
import { shareStrings } from '../../share/strings';
import { strings } from '../../strings';

function view({ state, store, data }: ScreenContext) {
  const { exchange } = data;
  const flow = state.importFlow;
  const panel = importPanel(flow, exchange, {
    add: () => void addShared(store, exchange),
    close: () => closeShared(store, exchange),
  });
  const body =
    flow.kind === 'busy'
      ? h('div', { class: 'status', role: 'status' }, h('h2', {}, shareStrings.opening))
      : (panel ?? h('div', { class: 'status' }, h('h2', {}, strings.notFound.title)));
  return {
    title: shareStrings.title,
    body: h(
      'div',
      { class: 'stack' },
      body,
      flow.kind === 'share-error' &&
        h('a', { class: 'btn btn--tonal', href: '#/drinks' }, strings.buttons.openDrinks),
    ),
  };
}

export const screens: Screen[] = [
  {
    id: 'share',
    destination: 'drinks',
    pushed: true,
    match: (route) => route.path[0] === 'share',
    view,
  },
];
