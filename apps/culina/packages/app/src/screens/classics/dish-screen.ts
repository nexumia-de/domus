// #/classic/<id>: one shipped classic. In this order: name and original name, course and meat flag,
// a portions stepper (the engine scales), the ingredient lines, "Cook step by step", the whole
// method; then, each closed behind a tap, the source, what we settled and the second check.
import { classicOf, techniques } from '../../classics/content';
import { cookView } from '../../classics/cook-view';
import { dishView, type DishView } from '../../classics/dish-view';
import { currentLang } from '../../classics/lang';
import { ingredientLabel, loadNames } from '../../classics/names';
import { portionsOf, setPortions, setStep } from '../../classics/session';
import { learnedSkills } from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { stepper } from '../stepper';
import { nutritionDetails } from './nutrition-block';
import { checkDetails, sourceDetails } from './source-block';
import { ingredientsBlock, methodBlock } from './recipe';
import { insteadFor } from './substitute-block';

const t = strings.classics;

const settledBlock = (view: DishView): HTMLElement => {
  const details = el('details', 'settled-block foot-block');
  details.append(el('summary', undefined, t.settledSummary));
  if (view.settled.length === 0) details.append(el('p', 'muted', t.settledNone));
  else {
    const list = el('ul', 'settled-list');
    for (const s of view.settled)
      list.append(el('li', undefined, t.settledEntry(s.what, s.value, s.reason)));
    details.append(list);
  }
  return details;
};

export const classicScreen = (id: string | undefined): HTMLElement => {
  const classic = id === undefined ? undefined : classicOf(id);
  const card = el('article', 'card classic-card');
  if (classic === undefined) {
    const back = el('a', 'family-link', t.backToStart);
    back.href = hashFor('start');
    card.append(back, el('h1', undefined, t.classicsTitle), el('p', 'note-quiet', t.unknownDish));
    return card;
  }
  const lang = currentLang();
  const back = el('a', 'family-link', t.backToCountry(t.countries[classic.country]));
  back.href = hashFor('classics', classic.country);
  const results = el('div', 'classic-results');
  const nutrition = nutritionDetails(classic);
  const cook = el('a', 'btn primary cook-start', t.cookButton);
  cook.href = hashFor('classic', classic.id, 'cook');
  cook.addEventListener('click', () => setStep(classic.id, 0));
  const draw = (portions: number): void => {
    nutrition.draw(portions);
    const nameOf = (ingredient: string): string => ingredientLabel(ingredient, lang);
    const shown = dishView(classic, portions, lang, nameOf);
    const steps = cookView(classic, portions, lang, nameOf, techniques(), learnedSkills());
    if (!shown.ok) {
      results.replaceChildren(el('p', 'note-quiet', t.portionsUnknown));
      return;
    }
    const method = steps.ok ? methodBlock(steps.steps) : undefined;
    results.replaceChildren(
      ingredientsBlock(shown.view.components, shown.view.slots, insteadFor(lang, nameOf)),
      cook,
      ...(method === undefined ? [] : [method]),
    );
  };
  const first = dishView(classic, portionsOf(classic.id), lang, (x) => ingredientLabel(x, lang));
  card.append(back, el('h1', undefined, first.ok ? first.view.name : classic.id));
  if (first.ok) {
    card.append(
      el('p', 'muted', t.originalName(first.view.originalName)),
      el(
        'p',
        'muted',
        `${t.course[first.view.course]} · ${first.view.vegetarian ? t.withoutMeat : t.withMeat}`,
      ),
    );
    if (first.view.note !== undefined) card.append(el('p', undefined, first.view.note));
  }
  const control = stepper(
    t.portionsLabel,
    t.portionsFewer,
    t.portionsMore,
    portionsOf(classic.id),
    (n) => {
      if (!(n > 0)) return;
      setPortions(classic.id, n);
      draw(n);
    },
  );
  card.append(control.wrap, results, nutrition.element);
  if (first.ok)
    card.append(sourceDetails(first.view), settledBlock(first.view), checkDetails(first.view));
  draw(portionsOf(classic.id));
  // The catalogue gives the ingredient names; draw again when it is there.
  void loadNames().then(() => draw(portionsOf(classic.id)));
  return card;
};
