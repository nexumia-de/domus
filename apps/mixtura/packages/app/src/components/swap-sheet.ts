// The sheet of one line in Try a Swap: the amount first (stepper and typed
// entry, so the field stays visible when the keyboard covers half the
// screen), then the offered ingredients in the engine's groups, then the
// search over all ingredients (docs/screens-browse.md#swap-mode). The same
// bottom sheet as the batch sheet.

import { h } from '../dom';
import { parseSwapAmount } from '../screens/spec/swap-state';
import type { OfferGroupVM, OfferVM, SwapSheetVM } from '../screens/spec/swap-sheet-vm';
import { swapStrings } from '../screens/spec/swap-strings';
import * as glyph from './glyphs';

export interface SwapSheetActions {
  close(): void;
  /** One step of the unit up (1) or down (-1). */
  step(direction: 1 | -1): void;
  /** A valid typed amount: applied at once. The text is kept so the field is not rewritten. */
  typeAmount(text: string): void;
  chooseIngredient(id: string): void;
  useSaved(): void;
  resetLine(): void;
  search(query: string): void;
  toggleMore(kind: string): void;
}

/** Scroll position of the sheet body, kept across the redraws a change causes. */
let kept = 0;

function offerRow(offer: OfferVM, actions: SwapSheetActions): HTMLElement {
  return h(
    'button',
    {
      type: 'button',
      class: offer.selected ? 'offer is-selected' : 'offer',
      'aria-pressed': offer.selected ? 'true' : 'false',
      'data-offer': offer.id,
      onclick: () => actions.chooseIngredient(offer.id),
    },
    h(
      'span',
      { class: 'offer-text' },
      h('span', { class: 'offer-name' }, offer.name),
      offer.path && h('span', { class: 'offer-path' }, offer.path),
    ),
    offer.selected && h('span', { class: 'offer-state' }, glyph.check(), swapStrings.selected),
  );
}

function group(vm: OfferGroupVM, actions: SwapSheetActions): HTMLElement {
  return h(
    'section',
    { class: 'sheet-group', 'aria-label': vm.label, 'data-group': vm.kind },
    h('h3', {}, vm.label),
    ...vm.offers.map((offer) => offerRow(offer, actions)),
    (vm.hidden > 0 || vm.expanded) &&
      h(
        'button',
        { type: 'button', class: 'btn btn--text', onclick: () => actions.toggleMore(vm.kind) },
        vm.expanded ? swapStrings.showFewer : swapStrings.showMore(vm.hidden),
      ),
  );
}

function amountSection(
  vm: NonNullable<SwapSheetVM['amount']>,
  lineUnit: string,
  actions: SwapSheetActions,
): HTMLElement {
  const hint = h(
    'p',
    { class: 'note swap-understood', id: 'swap-amount-hint', 'aria-live': 'polite' },
    vm.understood ?? swapStrings.amountHint,
  );
  const input = h('input', {
    type: 'text',
    inputmode: 'decimal',
    class: 'input',
    id: 'swap-amount',
    name: 'amount',
    'data-focus': 'swap-amount',
    'aria-label': swapStrings.amount,
    'aria-describedby': 'swap-amount-hint',
    value: vm.text,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  });
  // A valid amount is applied while typing; an invalid one is said calmly in
  // place when the field is left, never while the user is still typing.
  input.addEventListener('input', () => {
    const parsed = parseSwapAmount(input.value, lineUnit);
    if (parsed.ok) actions.typeAmount(input.value);
  });
  input.addEventListener('change', () => {
    const parsed = parseSwapAmount(input.value, lineUnit);
    if (!parsed.ok) {
      hint.textContent = swapStrings.notUnderstood(input.value.trim(), parsed.message);
      hint.setAttribute('role', 'alert');
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    input.dispatchEvent(new Event('change'));
    if (parseSwapAmount(input.value, lineUnit).ok) input.blur();
  });
  return h(
    'section',
    { class: 'sheet-group', 'aria-label': swapStrings.amount },
    h('h3', {}, swapStrings.amount),
    h(
      'div',
      { class: 'swap-amount' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': swapStrings.smaller,
          title: swapStrings.smaller,
          'data-focus': 'swap-down',
          onclick: () => actions.step(-1),
        },
        glyph.none(),
      ),
      input,
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': swapStrings.larger,
          title: swapStrings.larger,
          'data-focus': 'swap-up',
          onclick: () => actions.step(1),
        },
        glyph.plus(),
      ),
    ),
    hint,
  );
}

export function swapSheet(
  vm: SwapSheetVM,
  lineUnit: string,
  actions: SwapSheetActions,
): HTMLElement {
  const scroll = h(
    'div',
    { class: 'sheet-scroll' },
    vm.amount && amountSection(vm.amount, lineUnit, actions),
    vm.topNote && h('p', { class: 'note' }, vm.topNote),
    h(
      'section',
      { class: 'sheet-group', 'aria-label': swapStrings.ingredient },
      h('h3', {}, swapStrings.ingredient),
      h('p', { class: 'swap-now' }, swapStrings.now(vm.currentName)),
      vm.saved &&
        h(
          'button',
          { type: 'button', class: 'btn btn--tonal', onclick: actions.useSaved },
          swapStrings.saved(vm.saved.name),
        ),
    ),
    ...vm.groups.map((g) => group(g, actions)),
    vm.noOffers && h('p', { class: 'note', 'data-no-offers': '' }, swapStrings.noOffers),
    vm.rolelessNote && h('p', { class: 'note' }, vm.rolelessNote),
    h(
      'section',
      { class: 'sheet-group', 'aria-label': swapStrings.searchLabel },
      h('h3', {}, swapStrings.searchLabel),
      h('input', {
        type: 'search',
        class: 'input',
        name: 'ingredient-search',
        'data-focus': 'swap-search',
        'aria-label': swapStrings.searchLabel,
        value: vm.search.query,
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        oninput: (event) => actions.search((event.target as HTMLInputElement).value),
      }),
      ...vm.search.results.map((offer) => offerRow(offer, actions)),
      vm.search.none && h('p', { class: 'note' }, swapStrings.noMatch),
    ),
  );
  scroll.addEventListener('scroll', () => (kept = scroll.scrollTop));
  requestAnimationFrame(() => (scroll.scrollTop = kept));
  const sheet = h(
    'div',
    {
      class: 'sheet swap-sheet',
      role: 'dialog',
      'aria-label': vm.title,
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': '',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, vm.title),
      h(
        'button',
        {
          class: 'btn btn--icon',
          type: 'button',
          'aria-label': swapStrings.closeSheet,
          title: swapStrings.closeSheet,
          'data-focus': 'back',
          onclick: actions.close,
        },
        glyph.close(),
      ),
    ),
    scroll,
    h(
      'div',
      { class: 'sheet-bar' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          disabled: !vm.changed,
          'data-focus': 'reset-line',
          onclick: actions.resetLine,
        },
        swapStrings.resetLine,
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          'data-focus': 'swap-done',
          onclick: actions.close,
        },
        swapStrings.done,
      ),
    ),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // The sheet takes Escape itself; the app's Escape would leave the screen.
    event.stopPropagation();
    actions.close();
  });
  return h(
    'div',
    {
      class: 'sheet-backdrop sheet-backdrop--fixed swap-backdrop',
      onclick: (event) => {
        if (event.target === event.currentTarget) actions.close();
      },
    },
    sheet,
  );
}

/** Forgets the scroll position when the sheet is opened for another line. */
export function resetSwapSheetScroll(): void {
  kept = 0;
}
