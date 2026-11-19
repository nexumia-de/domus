// #/classic/<id>: one shipped classic. In this order: name and original name, course and meat flag,
// a portions stepper (the engine scales), the ingredient lines, "Cook step by step", the whole
// method; then, closed behind a tap, the nutrition and the source (with how it was checked and our
// remarks about it).
import { classicOf, techniques } from '../../classics/content';
import { cookView } from '../../classics/cook-view';
import { dishView } from '../../classics/dish-view';
import { currentLang } from '../../classics/lang';
import { ingredientLabel, loadNames } from '../../classics/names';
import { portionsOf, setPortions, setStep } from '../../classics/session';
import { learnedSkills } from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { stepper } from '../stepper';
import { nutritionDetails } from './nutrition-block';
import { sourceDetails } from './source-block';
import { ingredientsBlock, methodBlock } from './recipe';
import { insteadFor } from './substitute-block';

const t = strings.classics;

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
  // The source section is drawn again with the names (the catalogue loads after the first draw);
  // it keeps being open if the user opened it.
  const sourceHost = el('div', 'source-host');
  const nutrition = nutritionDetails(classic);
  const cook = el('a', 'btn primary cook-start', t.cookButton);
  cook.href = hashFor('classic', classic.id, 'cook');
  cook.addEventListener('click', () => setStep(classic.id, 0));
  const draw = (portions: number): void => {
    nutrition.draw(portions);
    const nameOf = (ingredient: string): string => ingredientLabel(ingredient, lang);
    const shown = dishView(classic, portions, lang, nameOf);
    if (shown.ok) {
      const wasOpen = sourceHost.querySelector('details')?.open === true;
      const source = sourceDetails(shown.view);
      source.open = wasOpen;
      sourceHost.replaceChildren(source);
    }
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
  card.append(sourceHost);
  draw(portionsOf(classic.id));
  // The catalogue gives the ingredient names; draw again when it is there.
  void loadNames().then(() => draw(portionsOf(classic.id)));
  return card;
};
