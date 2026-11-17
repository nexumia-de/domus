// Settings and About (built by #17). Choosing a value applies at once.

import { ALCOHOL_PRESETS, type AlcoholPreset } from '@mixtura/engine';
import { type Theme, type Units } from '../../app-state';
import { type YesNo } from '../../store';
import { h, icon } from '../../dom';
import { type Screen, type ScreenContext } from '../../screen';
import { strings } from '../../strings';
import { version } from '../../version';
import { dataRow, dataView, reminderBanner } from './data';

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

function presetLabels(
  presets: readonly AlcoholPreset[],
  text: (p: AlcoholPreset) => string,
): Record<string, string> {
  return Object.fromEntries(presets.map((p) => [p.id, text(p)]));
}

function alcoholSettings({ state, store }: ScreenContext): HTMLElement[] {
  const s = strings.settings;
  const chosen = (list: readonly AlcoholPreset[], id: string): AlcoholPreset =>
    list.find((p) => p.id === id) ?? (list[0] as AlcoholPreset);
  const without = chosen(ALCOHOL_PRESETS.without, state.alcoholWithout);
  const low = chosen(ALCOHOL_PRESETS.low, state.alcoholLow);
  return [
    choice<string>(
      'alcohol-without',
      s.alcoholWithout,
      presetLabels(ALCOHOL_PRESETS.without, (p) => s.presetWithout(p.maxPct, p.bound ?? 'upTo')),
      without.id,
      (alcoholWithout) => store.set({ alcoholWithout }),
    ),
    choice<string>(
      'alcohol-low',
      s.alcoholLow,
      presetLabels(ALCOHOL_PRESETS.low, (p) => s.presetLow(p.maxPct)),
      low.id,
      (alcoholLow) => store.set({ alcoholLow }),
    ),
    h('span', { class: 'hint' }, s.alcoholHint),
    h(
      'span',
      { class: 'hint', id: 'alcohol-basis' },
      s.alcoholBasis(without.evidence, low.evidence),
    ),
  ];
}

function buyNextSettings({ state, store }: ScreenContext): HTMLElement[] {
  const s = strings.settings;
  return [
    choice<YesNo>(
      'buy-next-drafts',
      s.buyNextDrafts,
      s.yesNo,
      state.buyNextDrafts,
      (buyNextDrafts) => store.set({ buyNextDrafts }),
    ),
    choice<YesNo>(
      'buy-next-retired',
      s.buyNextRetired,
      s.yesNo,
      state.buyNextRetired,
      (buyNextRetired) => store.set({ buyNextRetired }),
    ),
    h('span', { class: 'hint' }, s.buyNextHint),
  ];
}

function navRow(href: string, title: string, sub: string): HTMLElement {
  return h(
    'a',
    { class: 'row', href },
    h(
      'span',
      { class: 'row-main' },
      h('span', { class: 'row-title' }, title),
      h('span', { class: 'row-sub' }, sub),
    ),
    h('span', { class: 'row-chev' }, icon([['path', { d: 'M9 5l7 7-7 7' }]])),
  );
}

function settings(context: ScreenContext): HTMLElement {
  const { state, store, data } = context;
  const s = strings.settings;
  return h(
    'div',
    { class: 'stack' },
    reminderBanner(state, data.exchange),
    h(
      'div',
      { class: 'card' },
      choice<Units>('units', s.units, s.unitValues, state.units, (units) => store.set({ units })),
      h('span', { class: 'hint' }, s.unitsHint),
      ...alcoholSettings(context),
      ...buyNextSettings(context),
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
      dataRow(state),
      navRow('#/about', s.about, s.aboutHint),
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
    id: 'data',
    destination: 'settings',
    pushed: true,
    match: (route) =>
      route.path.length === 2 && route.path[0] === 'settings' && route.path[1] === 'data',
    view: (context) => ({ title: strings.titles.data, body: dataView(context) }),
  },
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
