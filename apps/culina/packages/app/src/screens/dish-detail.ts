// The detail of one dish: the portion control, the role slots with their amounts, and the raw
// ingredients of the whole dish for the chosen portions. On the current version a slot can be
// swapped for another component of its role: that changes what is shown and cooked now
// (`src/dishes/session.ts`), and only "Keep as my version" stores it, as a new version.
import { techniques } from '../classics/content';
import { currentLang } from '../classics/lang';
import { setStep } from '../classics/session';
import { dishStepLines } from '../components/steps-view';
import { cookInput } from '../cook/input';
import { lookupOf } from '../cook/lookup';
import { offersFor } from '../cook/offers';
import { cookToday, notebookSource } from '../cook/source';
import { alternativesFor, withSwaps, type Swapped } from '../dishes/alternatives';
import { dishRaw } from '../dishes/raw';
import { clearSwaps, setSwap, swapsOf } from '../dishes/session';
import { openRows, slotRows } from '../dishes/slots';
import { asNextVersion } from '../editor/version-save';
import { headOfFamily, newId, saveRecord, today } from '../notebook';
import type { DishRecord, Notebook } from '../records';
import { hashFor } from '../router';
import { formatNumber } from '../shared/mass';
import { el } from '../shell/el';
import { showToast } from '../shell/toast';
import { strings } from '../strings';
import { detailActions } from './detail-actions';
import { slotsSection } from './dish-slots';
import { storeText } from './editor/store-text';
import { rawBlock } from './raw-table';
import { stepper } from './stepper';
import { versionLines, versionSection } from './version-info';

export const dishDetail = (nb: Notebook, dish: DishRecord): HTMLElement => {
  const card = el('article', 'card dish-card');
  const back = el('a', 'back-link', strings.dishes.back);
  back.href = hashFor('dishes');
  card.append(back, el('h1', undefined, dish.name));
  if (dish.note !== undefined) card.append(el('p', 'muted', dish.note));
  card.append(versionLines('dishes', dish));
  const isHead = headOfFamily('dishes', dish.id)?.id === dish.id;
  if (isHead) card.append(detailActions('dishes', dish.id, dish.name));
  card.append(versionSection('dishes', dish));

  const results = el('div', 'dish-results');
  const source = notebookSource();
  const offers = offersFor(cookInput(source, cookToday()), lookupOf(source));
  let portions = dish.portions ?? 1;
  let open: number | undefined;
  let message: string | undefined;
  const focusSwap = (index?: number): void =>
    results
      .querySelector<HTMLElement>(index === undefined ? '[data-swap]' : `[data-swap="${index}"]`)
      ?.focus();

  /** Stores the dish as it is shown, as the next version, and opens that version. */
  const keep = async (shown: DishRecord, swapped: readonly Swapped[]): Promise<void> => {
    const change = swapped.map((s) => strings.dishes.swapChange(s.to, s.from)).join('; ');
    const record = asNextVersion(shown, false, { change }, newId(), today());
    const done = await saveRecord('dishes', record);
    if (!done.ok) {
      message = storeText(done.error.code);
      draw();
      return;
    }
    clearSwaps(dish.id);
    showToast(strings.editor.saved(record.name));
    window.location.hash = hashFor('dishes', record.id);
  };

  /** Under the slots while a filling is swapped: that nothing is stored, and the two ways on. */
  const swapNotice = (shown: DishRecord, swapped: readonly Swapped[]): HTMLElement => {
    const box = el('div', 'swap-notice');
    const actions = el('div', 'actions');
    const keepButton = el('button', 'btn primary swap-keep', strings.dishes.swapKeep);
    keepButton.type = 'button';
    keepButton.addEventListener('click', () => void keep(shown, swapped));
    const reset = el('button', 'btn quiet swap-reset', strings.dishes.swapReset);
    reset.type = 'button';
    reset.addEventListener('click', () => {
      clearSwaps(dish.id);
      setStep(dish.id, 0);
      open = undefined;
      draw();
      focusSwap();
    });
    actions.append(keepButton, reset);
    box.append(el('p', 'note-quiet', strings.dishes.swapNotice), actions);
    return box;
  };

  /** The assembly, and the way to cook the whole dish: its components first, then these steps. */
  const stepsSection = (shown: DishRecord): HTMLElement | undefined => {
    const assembly = dishStepLines(nb, shown, currentLang(), techniques());
    const cookable =
      assembly.length > 0 ||
      shown.slots.some(
        (slot) =>
          slot.ref.kind === 'component' &&
          (nb.components.find((c) => c.id === slot.ref.id)?.steps ?? []).length > 0,
      );
    if (!cookable) return undefined;
    const section = el('section', 'steps-section');
    if (assembly.length > 0) {
      const list = el('ol', 'recipe-steps');
      for (const line of assembly) list.append(el('li', undefined, line));
      section.append(el('h2', undefined, strings.dishes.assemblyHeading), list);
    }
    const cook = el('a', 'btn primary', strings.dishes.cookSteps);
    cook.href = hashFor('dishes', dish.id, 'cook');
    section.append(cook);
    return section;
  };

  const draw = (): void => {
    // The dish as it is shown and cooked now: the stored one with the fillings swapped for now.
    const { dish: shown, swapped } = withSwaps(nb, dish, swapsOf(dish.id));
    const rows = slotRows(nb, shown, portions);
    const raw = dishRaw(nb, rows);
    const n = formatNumber(portions, 2);
    const rawSection = el('section', 'raw-section');
    rawSection.append(
      el('h2', undefined, strings.notebook.rawHeading),
      rawBlock(raw, strings.notebook.rawPortions(n)),
    );
    // Only the current version is swapped: "Keep as my version" adds the next version to it.
    const slots = slotsSection(
      rows,
      openRows(shown, offers),
      isHead
        ? {
            alternatives: (index) => {
              const slot = shown.slots[index];
              return slot === undefined ? [] : alternativesFor(nb, slot);
            },
            ...(open === undefined ? {} : { open }),
            swapped: new Set(swapped.map((s) => s.index)),
            onToggle: (index) => {
              open = open === index ? undefined : index;
              draw();
              focusSwap(index);
            },
            onChoose: (index, componentId) => {
              setSwap(dish.id, index, componentId);
              // Other fillings have other steps: cooking starts at the first one again.
              setStep(dish.id, 0);
              open = undefined;
              draw();
              focusSwap(index);
            },
          }
        : undefined,
    );
    if (swapped.length > 0) slots.append(swapNotice(shown, swapped));
    const status = el('p', 'note-quiet');
    status.setAttribute('role', 'status');
    status.textContent = message ?? '';
    message = undefined;
    slots.append(status);
    const steps = stepsSection(shown);
    results.replaceChildren(slots, rawSection, ...(steps === undefined ? [] : [steps]));
  };
  const control = stepper(
    strings.dishes.portionsLabel,
    strings.dishes.portionsFewer,
    strings.dishes.portionsMore,
    portions,
    (value) => {
      portions = value;
      draw();
    },
  );
  draw();
  card.append(control.wrap, results);
  return card;
};
