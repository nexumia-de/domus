// The detail of one dish: the portion control, the role slots with their amounts, and the raw
// ingredients of the whole dish for the chosen portions.
import { cookInput } from '../cook/input';
import { cookToday, notebookSource } from '../cook/source';
import { lookupOf } from '../cook/lookup';
import { offersFor } from '../cook/offers';
import { dishRaw } from '../dishes/raw';
import { openRows, slotRows } from '../dishes/slots';
import { techniques } from '../classics/content';
import { currentLang } from '../classics/lang';
import { dishStepLines } from '../components/steps-view';
import { hashFor } from '../router';
import type { DishRecord, Notebook } from '../records';
import { formatNumber } from '../shared/mass';
import { el } from '../shell/el';
import { strings } from '../strings';
import { headOfFamily } from '../notebook';
import { detailActions } from './detail-actions';
import { versionLines, versionSection } from './version-info';
import { slotsSection } from './dish-slots';
import { rawBlock } from './raw-table';
import { stepper } from './stepper';

export const dishDetail = (nb: Notebook, dish: DishRecord): HTMLElement => {
  const card = el('article', 'card dish-card');
  const back = el('a', 'back-link', strings.dishes.back);
  back.href = hashFor('dishes');
  card.append(back, el('h1', undefined, dish.name));
  if (dish.note !== undefined) card.append(el('p', 'muted', dish.note));
  card.append(versionLines('dishes', dish));
  if (headOfFamily('dishes', dish.id)?.id === dish.id) {
    card.append(detailActions('dishes', dish.id, dish.name));
  }
  card.append(versionSection('dishes', dish));

  const results = el('div', 'dish-results');
  const source = notebookSource();
  const offers = offersFor(cookInput(source, cookToday()), lookupOf(source));
  const draw = (portions: number): void => {
    const rows = slotRows(nb, dish, portions);
    const raw = dishRaw(nb, rows);
    const n = formatNumber(portions, 2);
    const rawSection = el('section', 'raw-section');
    rawSection.append(
      el('h2', undefined, strings.notebook.rawHeading),
      rawBlock(raw, strings.notebook.rawPortions(n)),
    );
    results.replaceChildren(slotsSection(rows, openRows(dish, offers)), rawSection);
  };
  const initial = dish.portions ?? 1;
  const control = stepper(
    strings.dishes.portionsLabel,
    strings.dishes.portionsFewer,
    strings.dishes.portionsMore,
    initial,
    draw,
  );
  draw(initial);
  card.append(control.wrap, results);
  // The assembly, and the way to cook the whole dish: its components first, then these steps.
  const assembly = dishStepLines(nb, dish, currentLang(), techniques());
  const cookable =
    assembly.length > 0 ||
    dish.slots.some(
      (slot) =>
        slot.ref.kind === 'component' &&
        (nb.components.find((c) => c.id === slot.ref.id)?.steps ?? []).length > 0,
    );
  if (cookable) {
    const section = el('section', 'steps-section');
    if (assembly.length > 0) {
      const list = el('ol', 'recipe-steps');
      for (const line of assembly) list.append(el('li', undefined, line));
      section.append(el('h2', undefined, strings.dishes.assemblyHeading), list);
    }
    const cook = el('a', 'btn primary', strings.dishes.cookSteps);
    cook.href = hashFor('dishes', dish.id, 'cook');
    section.append(cook);
    card.append(section);
  }
  return card;
};
