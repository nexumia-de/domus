// #/dishes/<id> and #/classic/<id>: one dish, whatever its origin, drawn from one view model
// (`src/dishes/shown.ts`). Top to bottom: the name with the favourite toggle, the original name
// where there is one, the quiet line (course, cuisine, meat, origin), the note; what the dish can do (an own dish: its
// version, the day it was last cooked, Edit and the rest; a shipped dish: Keep in my notebook); the characters; the portions
// (kept in memory per dish, so the cook screen cooks them); the ingredient lines per component
// and for the dish; for an own dish the role slots with Swap; "Cook step by step"; the method;
// for an own dish what goes in, all the way down; up to five dishes like this one; then, closed
// behind a tap, what goes with the dish, the nutrition per portion and, for a shipped dish, the
// source.
//
// On the current version of an own dish a slot can be swapped for another component of its
// role: that changes what is shown and cooked now (`src/dishes/session.ts`), and only "Keep as my
// version" stores it, as a new version.
import { wantedLines } from '@culina/engine';
import type { Classic, FavouriteOrigin } from '@culina/engine';
import { likeInput } from '../browse/alike';
import { dishEntries, dishEntriesByKey } from '../browse/entries';
import { entryKey } from '../browse/entry';
import { characterLookup } from '../characters/lookup';
import { characterChips } from '../characters/view';
import { asChosen, chooseFilling, fillingChoices, withChoices } from '../classics/choices';
import { classicOf, techniques } from '../classics/content';
import { currentLang } from '../classics/lang';
import { ingredientLabel, loadNames } from '../classics/names';
import { portionsOf, setPortions, setStep } from '../classics/session';
import { roleLabel } from '../components/names';
import { cookInput } from '../cook/input';
import { lookupOf } from '../cook/lookup';
import { offersFor } from '../cook/offers';
import { cookToday, notebookSource } from '../cook/source';
import { alternativesFor, withSwaps, type Swapped } from '../dishes/alternatives';
import { clearSwaps, setSwap, swapsOf } from '../dishes/session';
import { shownOfClassic, shownOfDish, type ShownDish, type ShownResult } from '../dishes/shown';
import { openRows } from '../dishes/slots';
import { asNextVersion } from '../editor/version-save';
import { headOfFamily, learnedSkills, newId, saveRecord, stockOf, today } from '../notebook';
import type { DishRecord, Notebook } from '../records';
import { hashFor } from '../router';
import { formatNumber } from '../shared/mass';
import { el } from '../shell/el';
import { showToast } from '../shell/toast';
import { strings } from '../strings';
import { characterRow } from './character-chips';
import { dishCooklangAction } from './cooklang-action';
import { favouriteToggle } from './favourite-toggle';
import { cookedSection } from './dish-cooked';
import { keepButton } from './classics/finish';
import { nutritionDetails } from './classics/nutrition-block';
import { pairingDetails } from './classics/pairing-block';
import { ingredientsBlock, methodBlock } from './classics/recipe';
import { sourceDetails } from './classics/source-block';
import { insteadFor } from './classics/substitute-block';
import { backToList } from './list-return';
import { detailActions } from './detail-actions';
import { courseLabel, cuisineLabel } from './dish-filter';
import { likeSection } from './dish-like';
import { slotsSection } from './dish-slots';
import { storeText } from './editor/store-text';
import { handOverOffer } from './hand-over/offer';
import { rawBlock } from './raw-table';
import { stepper } from './stepper';
import { versionLines, versionSection } from './version-info';

const t = strings.classics;

/** The quiet line under the name: course, cuisine, meat and fish, and where the dish comes from. */
export const quietLine = (dish: ShownDish): string =>
  [
    dish.course === undefined ? undefined : courseLabel(dish.course),
    dish.cuisine === undefined ? undefined : cuisineLabel(dish.cuisine),
    dish.meatFree === undefined ? undefined : dish.meatFree ? t.withoutMeat : t.withMeat,
    dish.origin === 'own' ? strings.dishes.originOwn : strings.dishes.originShipped,
  ]
    .filter((part): part is string => part !== undefined)
    .join(' · ');

/** What differs between the two origins; everything else is drawn the same. */
interface DishPage {
  /** The key of the dish in the session (portions and the cook screen's step). */
  id: string;
  card: HTMLElement;
  /** The way back to the list; an own dish's hides from 720 px, where the list stands beside it. */
  back: HTMLElement;
  /** The name before the first view is there. */
  title: string;
  /** The portions before the cook chose any. */
  startPortions: number;
  shown: (portions: number) => ShownResult;
  /** Under the name: the version and its actions, or Keep in my notebook. */
  head: (portions: () => number) => HTMLElement[];
  /**
   * Right under the ingredients: the offer to put what the stock lacks on the shopping list (a
   * shipped dish, ./hand-over/offer.ts).
   */
  offer?: (portions: number, redraw: () => void) => HTMLElement[];
  /** Under the ingredients: the slots of an own dish with Swap. */
  afterIngredients?: (dish: ShownDish, redraw: () => void) => HTMLElement[];
  /** Under the method: what goes in, all the way down, for an own dish. */
  afterMethod?: (dish: ShownDish) => HTMLElement[];
  cookHref: string;
  /** The key of the dish among the entries of the lists: an own dish's is that of its family's head. */
  likeKey: string;
  /** Whose favourite mark the toggle sets: the origin and the id of the dish. */
  favourite: { origin: FavouriteOrigin; id: string };
}

const dishPage = (page: DishPage): HTMLElement => {
  const { card } = page;
  const lang = currentLang();
  const { back } = page;
  const title = el('h1', undefined, page.title);
  const favourite = favouriteToggle(page.favourite.origin, page.favourite.id);
  const titleRow = el('div', 'dish-title-row');
  titleRow.append(title, favourite.button);
  const original = el('p', 'muted original-name');
  original.hidden = true;
  const quiet = el('p', 'muted dish-quiet');
  card.append(back, titleRow, original, quiet, favourite.status);
  let portions = portionsOf(page.id, page.startPortions);
  card.append(...page.head(() => portions));

  const characterHost = el('div', 'character-host');
  const results = el('div', 'dish-results classic-results');
  const nutrition = nutritionDetails();
  const pairing = pairingDetails();
  // The source section is drawn again with the names (the catalogue loads after the first draw);
  // it keeps being open if the user opened it.
  const sourceHost = el('div', 'source-host');
  // Dishes like this one, under the recipe and above the closed sections at its foot.
  const likeHost = el('div', 'like-host');
  const instead = insteadFor(lang, (id) => ingredientLabel(id, lang));
  const cook = el('a', 'btn primary cook-start', t.cookButton);
  cook.href = page.cookHref;
  cook.addEventListener('click', () => setStep(page.id, 0));

  const draw = (): void => {
    const shown = page.shown(portions);
    if (!shown.ok) {
      results.replaceChildren(el('p', 'note-quiet', t.portionsUnknown));
      return;
    }
    const { dish } = shown;
    title.textContent = dish.name;
    if (dish.originalName !== undefined) {
      original.textContent = t.originalName(dish.originalName);
      original.hidden = false;
    }
    quiet.textContent = quietLine(dish);
    const characters = characterRow(characterChips(dish.characters, lang));
    characterHost.replaceChildren(...(characters === undefined ? [] : [characters]));
    const method = methodBlock(dish.steps);
    results.replaceChildren(
      ingredientsBlock(dish.components, dish.slots, instead),
      ...(page.offer?.(portions, draw) ?? []),
      ...(page.afterIngredients?.(dish, draw) ?? []),
      ...(dish.steps.length > 0 ? [cook] : []),
      ...(method === undefined ? [] : [method]),
      ...(page.afterMethod?.(dish) ?? []),
    );
    const like = likeSection(
      likeInput(dish.entry, page.likeKey, dishEntriesByKey().get(page.likeKey)),
      dishEntries(),
      lang,
    );
    likeHost.replaceChildren(...(like === undefined ? [] : [like]));
    nutrition.draw(dish.nutrition);
    pairing.draw(
      [...dish.components.flatMap((c) => c.lines), ...dish.slots].flatMap((line) =>
        line.ingredient === undefined ? [] : [{ ingredient: line.ingredient, name: line.name }],
      ),
    );
    if (dish.source !== undefined) {
      const wasOpen = sourceHost.querySelector('details')?.open === true;
      const source = sourceDetails(dish.source);
      source.open = wasOpen;
      sourceHost.replaceChildren(source);
    }
  };
  const control = stepper(
    strings.dishes.portionsLabel,
    strings.dishes.portionsFewer,
    strings.dishes.portionsMore,
    portions,
    (n) => {
      if (!(n > 0)) return;
      portions = n;
      setPortions(page.id, n);
      draw();
    },
  );
  card.append(
    characterHost,
    control.wrap,
    results,
    likeHost,
    pairing.element,
    nutrition.element,
    sourceHost,
  );
  draw();
  // The catalogue gives the ingredient names, groups and figures: drawn again once it is there.
  void loadNames().then(() => {
    draw();
  });
  return card;
};

const context = () => {
  const lang = currentLang();
  return {
    lang,
    nameOf: (id: string) => ingredientLabel(id, lang),
    lookup: characterLookup,
    known: techniques(),
    learned: learnedSkills(),
  };
};

/** What is ready in stock is not cooked again: the same rule on the dish and the cook screen. */
export const stockOptions = {
  ready: (componentId: string) => stockOf({ kind: 'component', id: componentId }).length > 0,
  fromStock: strings.dishes.fromStock,
};

export const classicScreen = (id: string | undefined): HTMLElement => {
  const classic: Classic | undefined = id === undefined ? undefined : classicOf(id);
  const card = el('article', 'card dish-card classic-card');
  if (classic === undefined) {
    const back = el('a', 'family-link', strings.cook.backToCook);
    back.href = hashFor('cook');
    card.append(back, el('h1', undefined, t.classicsTitle), el('p', 'note-quiet', t.unknownDish));
    return card;
  }
  const lang = currentLang();
  let refillKeep: () => void = () => undefined;
  return dishPage({
    id: classic.id,
    card,
    back: backToList('family-link', 'cook'),
    title: classic.id,
    startPortions: portionsOf(classic.id),
    // Shown as it is cooked with the fillings chosen; Keep copies the base with its alternatives.
    shown: (portions) => shownOfClassic(asChosen(classic), portions, context()),
    head: (portions) => {
      // A classic with an ingredient the catalogue lacks cannot be kept; the end of cooking says why.
      if (wantedLines(classic).length > 0) return [];
      const box = el('div', 'actions classic-copy');
      const status = el('p', 'note-quiet');
      status.setAttribute('role', 'status');
      const fill = (): void =>
        box.replaceChildren(
          keepButton(withChoices(classic), portions, lang, '.classic-copy', 'quiet'),
          status,
        );
      fill();
      refillKeep = fill;
      return [box];
    },
    offer: (portions, redraw) => handOverOffer(classic, portions, lang, redraw),
    afterIngredients: (_dish, redraw) => {
      const choices = fillingChoices(classic, lang);
      if (choices.length === 0) return [];
      const box = el('section', 'filling-choices');
      box.append(el('h2', undefined, t.fillingHeading));
      for (const choice of choices) {
        const label = el('label', 'field filling-choice');
        const select = el('select');
        select.dataset['slot'] = String(choice.slotIndex);
        for (const option of choice.options) {
          const item = el('option', undefined, option.name);
          item.value = option.id;
          item.selected = option.id === choice.current;
          select.append(item);
        }
        select.addEventListener('change', () => {
          // Also starts cooking it again at the first step: the method is another one.
          chooseFilling(classic, choice.slotIndex, select.value);
          refillKeep();
          redraw();
          card
            .querySelector<HTMLElement>(`.filling-choice select[data-slot="${choice.slotIndex}"]`)
            ?.focus();
        });
        label.append(el('span', 'field-label', roleLabel(choice.role)), select);
        box.append(label);
      }
      return [box];
    },
    cookHref: hashFor('classic', classic.id, 'cook'),
    likeKey: entryKey('shipped', classic.id),
    favourite: { origin: 'shipped', id: classic.id },
  });
};

export const dishDetail = (nb: Notebook, dish: DishRecord): HTMLElement => {
  const card = el('article', 'card dish-card');
  const isHead = headOfFamily('dishes', dish.id)?.id === dish.id;
  const source = notebookSource();
  const offers = offersFor(cookInput(source, cookToday()), lookupOf(source));
  let open: number | undefined;
  let message: string | undefined;
  let redraw: () => void = () => undefined;
  const focusSwap = (index?: number): void =>
    card
      .querySelector<HTMLElement>(index === undefined ? '[data-swap]' : `[data-swap="${index}"]`)
      ?.focus();

  /** Stores the dish as it is shown, as the next version, and opens that version. */
  const keep = async (shown: DishRecord, swapped: readonly Swapped[]): Promise<void> => {
    const change = swapped.map((s) => strings.dishes.swapChange(s.to, s.from)).join('; ');
    const record = asNextVersion(shown, false, { change }, newId(), today());
    const done = await saveRecord('dishes', record);
    if (!done.ok) {
      message = storeText(done.error.code);
      redraw();
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
      redraw();
      focusSwap();
    });
    actions.append(keepButton, reset);
    box.append(el('p', 'note-quiet', strings.dishes.swapNotice), actions);
    return box;
  };

  // The dish as it is shown and cooked now: the stored one with the fillings swapped for now.
  const current = () => withSwaps(nb, dish, swapsOf(dish.id));

  return dishPage({
    id: dish.id,
    card,
    back: backToList('back-link', 'dishes'),
    title: dish.name,
    startPortions: dish.portions ?? 1,
    shown: (portions) => ({
      ok: true,
      dish: shownOfDish(nb, current().dish, portions, context(), stockOptions),
    }),
    head: () => [
      ...(dish.note === undefined ? [] : [el('p', 'muted', dish.note)]),
      versionLines('dishes', dish),
      cookedSection(dish.id),
      ...(isHead ? [detailActions('dishes', dish.id, dish.name)] : []),
      dishCooklangAction(dish),
      versionSection('dishes', dish),
    ],
    afterIngredients: (view, draw) => {
      redraw = draw;
      const { dish: shown, swapped } = current();
      const rows = view.fillings?.rows ?? [];
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
      return [slots];
    },
    afterMethod: (view) => {
      if (view.fillings === undefined) return [];
      const rawSection = el('section', 'raw-section');
      rawSection.append(
        el('h2', undefined, strings.notebook.rawHeading),
        rawBlock(view.fillings.raw, strings.notebook.rawPortions(formatNumber(view.portions, 2))),
      );
      return [rawSection];
    },
    cookHref: hashFor('dishes', dish.id, 'cook'),
    // An older version is the same dish as the head of its family, which the lists show.
    likeKey: entryKey('own', headOfFamily('dishes', dish.id)?.id ?? dish.id),
    favourite: { origin: 'own', id: dish.id },
  });
};
