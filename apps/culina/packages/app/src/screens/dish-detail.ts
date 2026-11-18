// The detail of one dish: the portion control, the role slots with their amounts, and the raw
// ingredients of the whole dish for the chosen portions.
import { dishRaw } from '../dishes/raw';
import { openRows, slotRows } from '../dishes/slots';
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
  const draw = (portions: number): void => {
    const rows = slotRows(nb, dish, portions);
    const raw = dishRaw(nb, rows);
    const n = formatNumber(portions, 2);
    const rawSection = el('section', 'raw-section');
    rawSection.append(
      el('h2', undefined, strings.notebook.rawHeading),
      rawBlock(raw, strings.notebook.rawPortions(n)),
    );
    results.replaceChildren(slotsSection(rows, openRows(dish)), rawSection);
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
  return card;
};
