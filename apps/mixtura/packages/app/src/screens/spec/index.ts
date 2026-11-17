// The spec screen (#19): one drink as a bartender reads it, lines first,
// then the balance against the template's usual range. Route `#/drinks/<id>`
// with the lineage id; it opens the newest version. The bottom bar (Try a
// Swap, Riff, Edit) and the overflow menu come with the issues that build
// those actions (#20, #27, #25): until then only built actions are shown.
// Try a Swap (#20) is the same screen with a swap in the address.

import type { BatchActions } from '../../components/batch-controls';
import { batchSheet } from '../../components/batch-sheet';
import { balancePanel } from '../../components/balance-panel';
import { servingsStepper, type StepperActions } from '../../components/servings-stepper';
import { stockPanel, stockTag, type StockPanelActions } from '../../components/stock-panel';
import { specLines, specMeta, type LineActions } from '../../components/spec-lines';
import { h } from '../../dom';
import { go, replace } from '../../navigation';
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
import { batchActions } from './batch-actions';
import { volumeOf } from './batch-target';
import { servingsOf, specAddress } from './servings';
import { versionStrings as vs } from '../versions/strings';
import { specVM, type SpecVM, type TagVM } from './view-model';
import { stockPanelVM, type StockPanelVM } from './stock-panel-vm';
import { shelfCard, type ShelfActions } from '../../components/shelf-card';
import { shelfVM, type ShelfVM } from './shelf-vm';
import { shelfStrings } from './shelf-strings';
import { today } from '../../today';
import { variantCard } from '../../components/variant-card';
import { variantVMs } from './variant-vm';
import { alcoholOf, thresholdsFor } from '../browse/alcohol';
import { stockStrings } from './stock-strings';
import { madeBatch, usedUpNewest } from '../../stock/batches';
import type { Stock } from '../../store';
import { changeStock, stockState, withPresent } from '../../stock/state';
import { showToast } from '../../toasts';

function tag(vm: TagVM): HTMLElement {
  const classes = `tag${vm.strong ? ' tag--strong' : ''}${vm.href ? ' tag--link' : ''}`;
  return vm.href
    ? h('a', { class: classes, href: vm.href }, vm.text)
    : h('span', { class: classes }, vm.text);
}

function body(
  vm: SpecVM,
  actions: LineActions & StepperActions & { batch: BatchActions },
  swap: SwapActions,
  lineUnit: string,
  stock: { vm: StockPanelVM | undefined; actions: StockPanelActions },
  shelf: { vm: ShelfVM | undefined; actions: ShelfActions },
  variants: ReturnType<typeof variantVMs> | undefined,
): HTMLElement {
  return h(
    'div',
    { class: vm.swap ? 'spec spec--swap' : 'spec' },
    vm.swap &&
      h('div', { class: 'banner swap-banner', role: 'status' }, h('span', {}, vm.swap.banner)),
    h('div', { class: 'tags' }, ...vm.tags.map(tag), stockTag(stock.vm)),
    h(
      'div',
      { class: 'two-col' },
      h(
        'div',
        { class: 'stack' },
        h(
          'section',
          { class: 'card', 'aria-labelledby': 'ingredients-title' },
          h('h2', { id: 'ingredients-title' }, strings.spec.ingredients),
          servingsStepper(vm.servings, actions),
          specLines(vm.lines, actions),
          specMeta(vm.meta),
        ),
        !vm.swap && shelfCard(shelf.vm, shelf.actions),
        !vm.swap && variantCard(variants),
        !vm.swap && stockPanel(stock.vm, stock.actions),
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
    vm.related &&
      !vm.swap &&
      h(
        'nav',
        { class: 'related', 'aria-label': vs.title },
        vm.related.versions &&
          h(
            'a',
            { class: 'btn btn--tonal', href: vm.related.versions.href },
            vm.related.versions.text,
          ),
        h('a', { class: 'btn btn--tonal', href: vm.related.family.href }, vm.related.family.text),
      ),
    vm.source &&
      h(
        'p',
        { class: 'note source-line' },
        `${vm.source} \u00b7`,
        h('a', { class: 'line-link', href: '#/about' }, strings.spec.sourceLink),
      ),
    vm.swap && compactBar(vm.swap.compact),
    vm.batch && batchSheet(vm.batch, actions.batch),
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

/** The riff editor of a drink; a swap in the address makes the riff start from the swapped lines. */
const riffAddress = (id: string, swap: string | null): string =>
  `#/drinks/${encodeURIComponent(id)}/riff${swap ? `?swap=${encodeURIComponent(swap)}` : ''}`;

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
      const volumeMl = volumeOf(route.query);
      const swapState = swapOf(route.query);
      const sheetLine = swapState ? sheetLineOf(route.query) : null;
      const swap = swapActions(store, route, id, drink.spec.lines, sheetLine);
      const actions: LineActions & StepperActions & { batch: BatchActions } = {
        ...(swapState && { openLine: swap.openLine }),
        setServings: (n) =>
          replace(store, specAddress(route, n, sheetOpen ? 'batch' : null, volumeMl)),
        openBatch: () => (wide() ? replace : go)(store, specAddress(route, servings, 'batch')),
        batch: batchActions(store, route, servings, wide()),
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
        ...(volumeMl !== undefined && { volumeMl }),
        swap: swapState,
        sheetLine,
      });
      const lineUnit = sheetLine === null ? 'ml' : (drink.spec.lines[sheetLine]?.unit ?? 'ml');
      const stockNow = stockState(context);
      const records = stockNow.kind === 'ready' ? stockNow.records : null;
      const stockActions: StockPanelActions = {
        ...(stockNow.kind === 'ready' &&
          stockNow.writable && {
            mark(ingredientId, name) {
              const undo = changeStock(context, [
                { id: ingredientId, next: withPresent(records ?? new Map(), ingredientId, true) },
              ]);
              showToast(store, stockStrings.marked(name), () => changeStock(context, undo));
            },
          }),
      };
      const shelfVm =
        records && !swapState ? shelfVM(state.model, drink.spec, records, today()) : undefined;
      const record = (next: Stock | null, text: string): void => {
        if (!shelfVm) return;
        if (!next) return void showToast(store, shelfStrings.alreadyRecorded);
        const undo = changeStock(context, [{ id: shelfVm.ingredientId, next }]);
        showToast(store, text, () => changeStock(context, undo));
      };
      const made = (date: string): void =>
        record(
          shelfVm
            ? madeBatch(records?.get(shelfVm.ingredientId), shelfVm.ingredientId, date)
            : null,
          shelfVm ? shelfStrings.recorded(shelfVm.name, date) : '',
        );
      const shelfActions: ShelfActions =
        stockNow.kind === 'ready' && stockNow.writable
          ? {
              madeToday: () => made(today()),
              madeOn: made,
              usedUp: () =>
                shelfVm &&
                record(
                  usedUpNewest(records?.get(shelfVm.ingredientId), shelfVm.ingredientId),
                  shelfStrings.usedUpToast(shelfVm.name),
                ),
            }
          : {};
      const page = body(
        vm,
        actions,
        swap,
        lineUnit,
        {
          vm: records && !swapState ? stockPanelVM(state.model, drink.spec, records) : undefined,
          actions: stockActions,
        },
        { vm: shelfVm, actions: shelfActions },
        swapState
          ? undefined
          : variantVMs(
              state.model,
              drink.spec,
              alcoholOf(
                state.model,
                drink,
                thresholdsFor(context.state.alcoholWithout, context.state.alcoholLow),
              ).class,
            ),
      );
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
              'div',
              { class: 'bar-buttons' },
              h(
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
              ),
              h(
                'a',
                {
                  class: 'btn btn--primary',
                  href: riffAddress(id, route.query.get('swap')),
                  'aria-label': vs.saveAsRiffAria,
                  'data-focus': 'riff-from-swap',
                },
                vs.saveAsRiff,
              ),
            )
          : h(
              'div',
              { class: 'bar-buttons' },
              h(
                'a',
                {
                  class: 'btn',
                  href: `#/drinks/${encodeURIComponent(id)}/edit`,
                  'data-focus': 'edit',
                  'aria-label': strings.spec.editAria(vm.name),
                },
                strings.spec.edit,
              ),
              h(
                'a',
                {
                  class: 'btn',
                  href: riffAddress(id, null),
                  'aria-label': vs.riffAria(vm.name),
                  'data-focus': 'riff',
                },
                vs.riff,
              ),
              h(
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
            ),
        list: drinksPane(context, 'detail', id),
      };
    },
  },
];
