// Settings and About (built by #17). Choosing a value applies at once.

import { type Theme, type Units } from '../../app-state';
import { h, icon } from '../../dom';
import { type Screen, type ScreenContext } from '../../screen';
import { strings } from '../../strings';
import { version } from '../../version';

function choice<V extends string>(
  name: string,
  label: string,
  values: Record<V, string>,
  current: V,
  pick: (value: V) => void,
): HTMLElement {
  return h(
    'div',
    { class: 'field' },
    h('span', { class: 'label', id: `label-${name}` }, label),
    h(
      'div',
      { class: 'segmented', role: 'group', 'aria-labelledby': `label-${name}` },
      ...(Object.keys(values) as V[]).map((value) =>
        h(
          'button',
          {
            type: 'button',
            'aria-pressed': String(value === current),
            'data-focus': `${name}-${value}`,
            onclick: () => pick(value),
          },
          values[value],
        ),
      ),
    ),
  );
}

function settings({ state, store }: ScreenContext): HTMLElement {
  const s = strings.settings;
  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'card' },
      choice<Units>('units', s.units, s.unitValues, state.units, (units) => store.set({ units })),
      h('span', { class: 'hint' }, s.unitsHint),
      choice<Theme>('theme', s.appearance, s.themeValues, state.theme, (theme) =>
        store.set({ theme }),
      ),
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'label' }, s.storage),
        h(
          'span',
          { class: 'hint', id: 'persistence' },
          state.storage.kind === 'error'
            ? s.storageUnavailable
            : s.storageValues[state.persistence],
        ),
      ),
    ),
    h(
      'div',
      { class: 'card card--flush' },
      h(
        'a',
        { class: 'row', href: '#/about' },
        h(
          'span',
          { class: 'row-main' },
          h('span', { class: 'row-title' }, s.about),
          h('span', { class: 'row-sub' }, s.aboutHint),
        ),
        h('span', { class: 'row-chev' }, icon([['path', { d: 'M9 5l7 7-7 7' }]])),
      ),
    ),
  );
}

function about(): HTMLElement {
  const a = strings.about;
  return h(
    'div',
    { class: 'card' },
    h('h2', {}, strings.appName),
    h('span', {}, `${a.version} ${version}`),
    h('span', {}, a.licence),
    h('span', { class: 'hint' }, a.updates),
  );
}

export const screens: Screen[] = [
  {
    id: 'settings',
    destination: 'settings',
    pushed: false,
    match: (route) => route.path.length === 1 && route.path[0] === 'settings',
    view: (context) => ({ title: strings.titles.settings, body: settings(context) }),
  },
  {
    id: 'about',
    destination: 'settings',
    pushed: true,
    match: (route) => route.path.length === 1 && route.path[0] === 'about',
    view: () => ({ title: strings.titles.about, body: about() }),
  },
];
