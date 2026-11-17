// The spec screen (#19): one drink as a bartender reads it, lines first,
// then the balance against the template's usual range. Route `#/drinks/<id>`
// with the lineage id; it opens the newest version. The bottom bar (Try a
// Swap, Riff, Edit) and the overflow menu come with the issues that build
// those actions (#20, #27, #25): until then only built actions are shown.
// Try a Swap (#20) is the same screen with a swap in the address.

import { batchSheet } from '../../components/batch-sheet';
import { balancePanel } from '../../components/balance-panel';
import { servingsStepper, type StepperActions } from '../../components/servings-stepper';
import { specLines, specMeta, type LineActions } from '../../components/spec-lines';
import { h } from '../../dom';
import { back, go, replace } from '../../navigation';
import { type Route } from '../../router';
import { type Screen, type ScreenContext, type ScreenView } from '../../screen';
import { strings } from '../../strings';
import { browseState } from '../browse/load';
import { drinksPane, failedStatus, loadingStatus } from '../drinks/pane';
import { swapSheet } from '../../components/swap-sheet';
import { compactBar } from '../../components/compact-balance';
import { openTopField, parseTopVolume, setTopMl, viewFor } from './session';
import { sheetLineOf, swapActions, type SwapActions } from './swap-actions';
import { swapOf } from './swap-state';
import { swapStrings } from './swap-strings';
import { servingsOf, specAddress } from './servings';
import { specVM, type SpecVM, type TagVM } from './view-model';

function tag(vm: TagVM): HTMLElement {
  const classes = `tag${vm.strong ? ' tag--strong' : ''}${vm.href ? ' tag--link' : ''}`;
  return vm.href
    ? h('a', { class: classes, href: vm.href }, vm.text)
    : h('span', { class: classes }, vm.text);
}

function body(
  vm: SpecVM,
  actions: LineActions & StepperActions & { closeBatch(): void },
  swap: SwapActions,
  lineUnit: string,
): HTMLElement {
  return h(
    'div',
    { class: vm.swap ? 'spec spec--swap' : 'spec' },
    vm.swap &&
      h('div', { class: 'banner swap-banner', role: 'status' }, h('span', {}, vm.swap.banner)),
    h('div', { class: 'tags' }, ...vm.tags.map(tag)),
    h(
      'div',
      { class: 'two-col' },
      h(
        'section',
        { class: 'card', 'aria-labelledby': 'ingredients-title' },
        h('h2', { id: 'ingredients-title' }, strings.spec.ingredients),
        servingsStepper(vm.servings, actions),
        specLines(vm.lines, actions),
        specMeta(vm.meta),
      ),
      h(
        'div',
        { class: 'stack' },
        balancePanel(vm.balance),
        vm.swap?.templateChange &&
          h(
            'p',
            { class: 'note swap-template', role: 'status', 'data-template-change': '' },
            vm.swap.templateChange,
          ),
        vm.noTemplateNote && h('p', { class: 'note' }, vm.noTemplateNote),
        vm.servings > 1 && h('p', { class: 'note' }, strings.spec.servingsFigures),
      ),
    ),
    vm.notes &&
      h(
        'section',
        { class: 'card' },
        h('h2', {}, strings.spec.notes),
        h('p', { class: 'spec-notes' }, vm.notes),
      ),
    vm.source &&
      h(
        'p',
        { class: 'note source-line' },
        `${vm.source} \u00b7`,
        h('a', { class: 'line-link', href: '#/about' }, strings.spec.sourceLink),
      ),
    vm.swap && compactBar(vm.swap.compact),
    vm.batch && batchSheet(vm.batch, actions.closeBatch),
    vm.swap?.sheet && swapSheet(vm.swap.sheet, lineUnit, swap),
  );
}

function notFound(context: ScreenContext): ScreenView {
  return {
    title: strings.titles.notFound,
    body: h(
      'div',
      { class: 'status' },
      h('h2', {}, strings.spec.notFoundTitle),
      h('p', {}, strings.spec.notFoundText),
      h('a', { class: 'btn btn--primary', href: '#/drinks' }, strings.buttons.openDrinks),
    ),
    list: drinksPane(context, 'detail'),
  };
}

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;
let sheetWasOpen = false;
let lineSheetWas: number | null = null;

const isSpec = (route: Route): boolean =>
  route.path[0] === 'drinks' && route.path.length === 2 && route.path[1] !== 'new';

export const screens: Screen[] = [
  {
    id: 'spec',
    destination: 'drinks',
    pushed: true,
    match: isSpec,
    view(context) {
      const id = context.route.path[1] ?? '';
      const state = browseState(context);
      if (state.kind !== 'ready') {
        return {
          title: strings.titles.drinks,
          body: state.kind === 'loading' ? loadingStatus() : failedStatus(state.reason),
          list: drinksPane(context, 'detail'),
        };
      }
      const drink = state.model.byLineage.get(id);
      if (!drink) return notFound(context);
      const { store } = context;
      const view = viewFor(store.get().specView, id);
      const { route } = context;
      const servings = servingsOf(route.query);
      const sheetOpen = route.query.get('sheet') === 'batch';
      const swapState = swapOf(route.query);
      const sheetLine = swapState ? sheetLineOf(route.query) : null;
      const swap = swapActions(store, route, id, drink.spec.lines, sheetLine);
      const actions: LineActions & StepperActions & { closeBatch(): void } = {
        ...(swapState && { openLine: swap.openLine }),
        setServings: (n) => replace(store, specAddress(route, n, sheetOpen ? 'batch' : null)),
        openBatch: () => (wide() ? replace : go)(store, specAddress(route, servings, 'batch')),
        closeBatch() {
          const without = specAddress(route, servings, null);
          if (wide()) replace(store, without);
          else back(store, without);
        },
        editTop: (index) => store.set({ specView: openTopField(store.get().specView, id, index) }),
        setTop(index, text) {
          const volume = parseTopVolume(text);
          if (volume.ok)
            store.set({ specView: setTopMl(store.get().specView, id, index, volume.ml) });
          return volume.ok;
        },
        clearTop: (index) =>
          store.set({ specView: setTopMl(store.get().specView, id, index, null) }),
      };
      const vm = specVM(state.model, drink.spec, context.state.units, {
        origin: drink.origin,
        view,
        servings,
        batch: sheetOpen,
        swap: swapState,
        sheetLine,
      });
      const lineUnit = sheetLine === null ? 'ml' : (drink.spec.lines[sheetLine]?.unit ?? 'ml');
      const page = body(vm, actions, swap, lineUnit);
      if (sheetOpen && !sheetWasOpen) {
        requestAnimationFrame(() =>
          (page as HTMLElement).querySelector<HTMLElement>('[data-sheet]')?.focus(),
        );
      }
      sheetWasOpen = sheetOpen;
      if (sheetLine !== null && sheetLine !== lineSheetWas) {
        requestAnimationFrame(() =>
          (page as HTMLElement).querySelector<HTMLElement>('[data-sheet]')?.focus(),
        );
      }
      lineSheetWas = sheetLine;
      return {
        title: vm.name,
        body: page,
        actions: swapState
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn btn--tonal',
                disabled: (vm.swap?.count ?? 0) === 0,
                'aria-label': swapStrings.resetAria,
                'data-focus': 'swap-reset',
                onclick: swap.resetAll,
              },
              swapStrings.reset,
            )
          : h(
              'button',
              {
                type: 'button',
                class: 'btn btn--primary',
                'aria-label': swapStrings.tryAria,
                'data-focus': 'try-swap',
                onclick: swap.start,
              },
              strings.spec.trySwap,
            ),
        list: drinksPane(context, 'detail', id),
      };
    },
  },
];
