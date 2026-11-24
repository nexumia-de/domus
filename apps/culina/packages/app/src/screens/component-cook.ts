// The one step-by-step screen: #/classic/<id>/cook (a shipped dish), #/dishes/<id>/cook (an own
// dish) and #/components/<id>/cook (an own component). One step on the screen with the part it
// belongs to, what it uses with the amounts for the portions chosen on the dish screen, time and
// temperature, the note of its skill while the skill is not learned, the handling rules of its
// ingredients, "Instead" on an ingredient line, large Back and Next, progress, the whole recipe
// (ingredients and method) in a tap, and the screen kept awake. A dish runs through its components
// in the order of its slots and then through its assembly; a component that is ready in stock is
// one step; a filling swapped on the dish screen (`src/dishes/session.ts`) is the one cooked. At the
// end a shipped dish can be kept in the notebook; an own one leads back.
import type { Classic } from '@culina/engine';
import { characterLookup } from '../characters/lookup';
import { asChosen, withChoices } from '../classics/choices';
import { classicOf, handlingRulesList, techniques } from '../classics/content';
import type { StepView } from '../classics/cook-view';
import type { ComponentView, LineView } from '../classics/dish-view';
import { handlingNotes, type HandlingNote } from '../classics/handling-view';
import { currentLang } from '../classics/lang';
import { ingredientLabel, loadNames } from '../classics/names';
import { portionsOf, setStep, stepOf } from '../classics/session';
import { catalogueTree } from '../classics/tree';
import { componentLines, ownCookView } from '../components/steps-view';
import { withSwaps } from '../dishes/alternatives';
import { swapsOf } from '../dishes/session';
import { shownOfClassic, shownOfDish } from '../dishes/shown';
import { getComponent, getDish, learnedSkills, notebook, setLearned } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { keepAwake } from '../shell/wake-lock';
import { strings } from '../strings';
import { stockOptions } from './dish-detail';
import { finishPanel } from './classics/finish';
import { handlingNote } from './classics/handling-note';
import { ingredientsBlock, lineList, methodBlock } from './classics/recipe';
import { insteadFor } from './classics/substitute-block';
import { techniqueNote } from './classics/technique-note';
import { storeText } from './editor/store-text';

const t = strings.classics;

/** What is cooked, for what is learned so far: the steps and the whole recipe. */
interface Cooked {
  name: string;
  steps: StepView[];
  components: readonly ComponentView[];
  slots: readonly LineView[];
}

/** What the screen cooks: where Back leads, the view, and what the end shows. */
interface Cookable {
  id: string;
  name: string;
  backHash: string;
  backLabel: string;
  view: (learned: ReadonlySet<string>) => Cooked;
  /** The end of cooking under the status line; `total` is the number of steps. */
  finish: (total: number, status: HTMLElement) => HTMLElement[];
}

const unknown = (backHash: string, backLabel: string, title: string, text: string): HTMLElement => {
  const section = el('section', 'screen cook-steps');
  const back = el('a', 'family-link', backLabel);
  back.href = backHash;
  section.append(back, el('h1', undefined, title), el('p', 'note-quiet', text));
  return section;
};

const context = (learned: ReadonlySet<string>) => {
  const lang = currentLang();
  return {
    lang,
    nameOf: (id: string) => ingredientLabel(id, lang),
    lookup: characterLookup,
    known: techniques(),
    learned,
  };
};

const cookScreen = (cooked: Cookable): HTMLElement => {
  const section = el('section', 'screen cook-steps');
  const back = el('a', 'family-link', cooked.backLabel);
  back.href = cooked.backHash;
  const lang = currentLang();
  const instead = insteadFor(lang, (id) => ingredientLabel(id, lang));
  const title = el('h1', undefined, cooked.name);
  section.append(back, title);

  const progress = el('progress', 'cook-progress');
  progress.setAttribute('aria-hidden', 'true');
  const body = el('div', 'cook-body');
  const buttons = el('div', 'cook-buttons');
  const prev = el('button', 'btn cook-prev', t.back);
  const next = el('button', 'btn primary cook-next', t.next);
  prev.type = 'button';
  next.type = 'button';
  buttons.append(prev, next);
  const whole = el('details', 'cook-whole');
  const recipe = el('div', 'cook-whole-body');
  whole.append(el('summary', undefined, t.recipeHeading), recipe);
  section.append(progress, body, buttons, whole);

  const go = (step: number, total: number): void => {
    setStep(cooked.id, Math.max(0, Math.min(total, step)));
    draw(true);
  };

  let message: string | undefined;
  let rules = new Map<number, HandlingNote[]>();
  let name = cooked.name;
  const draw = (moveFocus: boolean): void => {
    const learned = learnedSkills();
    const view = cooked.view(learned);
    const { steps } = view;
    name = view.name;
    title.textContent = name;
    rules = handlingNotes(steps, handlingRulesList(), catalogueTree(), learned);
    const total = steps.length;
    const at = Math.min(stepOf(cooked.id), total);
    progress.max = Math.max(total, 1);
    progress.value = at;
    const method = methodBlock(steps);
    recipe.replaceChildren(
      ingredientsBlock(view.components, view.slots, instead),
      ...(method === undefined ? [] : [method]),
    );
    prev.disabled = at === 0;
    next.hidden = at >= total;
    next.textContent = at === total - 1 ? t.finish : t.next;
    prev.onclick = () => go(at - 1, total);
    next.onclick = () => go(at + 1, total);
    const status = el('p', 'note-quiet');
    status.setAttribute('role', 'status');
    status.tabIndex = -1;
    status.textContent = message ?? '';
    const announced = message !== undefined;
    message = undefined;
    if (at >= total) body.replaceChildren(...cooked.finish(total, status));
    else {
      const step = steps[at] as StepView;
      body.replaceChildren(
        el('h2', 'cook-step-heading', t.stepHeading(step.number, total)),
        status,
        stepBody(step),
      );
    }
    const target = announced ? status : body.querySelector<HTMLElement>('h2');
    if (target !== null) target.tabIndex = -1;
    if (moveFocus) target?.focus();
  };

  const learn = (technique: string, label: string): void => {
    void setLearned(technique, true).then((done) => {
      message = done.ok ? t.learnedDone(label) : storeText(done.error.code);
      draw(true);
    });
  };

  const stepBody = (step: StepView): HTMLElement => {
    const box = el('div', 'cook-step');
    // A dish names the part a step belongs to; a component is its own only part.
    if (step.component !== name) box.append(el('p', 'muted', t.stepFrom(step.component)));
    if (step.text !== '') box.append(el('p', 'cook-step-text', step.text));
    if (step.lines.length > 0) {
      box.append(el('h3', undefined, t.usesHeading), lineList(step.lines, t.usesHeading, instead));
    }
    const facts = [
      step.time === undefined ? undefined : t.timeLabel(step.time),
      step.temperature === undefined ? undefined : t.temperatureLabel(step.temperature),
    ].filter((x): x is string => x !== undefined);
    if (facts.length > 0) box.append(el('p', 'cook-facts', facts.join(' · ')));
    if (step.note && step.technique !== undefined) {
      const technique = step.technique;
      box.append(techniqueNote(technique, lang, () => learn(technique.id, technique.name[lang])));
    }
    for (const note of rules.get(step.number - 1) ?? []) {
      const label = techniques().find((x) => x.id === note.rule.technique)?.name[lang];
      box.append(
        handlingNote(note, lang, () => learn(note.rule.technique, label ?? note.rule.technique)),
      );
    }
    return box;
  };

  draw(false);
  keepAwake(section);
  // The catalogue gives the names and the tree for the handling rules; draw again when it is there.
  void loadNames().then(() => {
    draw(false);
  });
  return section;
};

/** The end of an own recipe: a heading and the way back. */
const ownFinish =
  (noSteps: string, done: string, backHash: string, backLabel: string) =>
  (total: number, status: HTMLElement): HTMLElement[] => {
    const link = el('a', 'btn primary', backLabel);
    link.href = backHash;
    return [el('h2', 'cook-step-heading', total === 0 ? noSteps : done), status, link];
  };

export const cookClassicScreen = (id: string | undefined): HTMLElement => {
  const classic: Classic | undefined = id === undefined ? undefined : classicOf(id);
  if (classic === undefined) {
    return unknown(hashFor('cook'), strings.cook.backToCook, t.classicsTitle, t.unknownDish);
  }
  const portions = portionsOf(classic.id);
  return cookScreen({
    id: classic.id,
    name: classic.id,
    backHash: hashFor('classic', classic.id),
    backLabel: t.backToRecipe,
    view: (learned) => {
      const shown = shownOfClassic(asChosen(classic), portions, context(learned));
      return shown.ok ? shown.dish : { name: classic.id, steps: [], components: [], slots: [] };
    },
    finish: (total, status) => [
      ...(total === 0 ? [el('p', 'note-quiet', t.noSteps)] : []),
      status,
      finishPanel(withChoices(classic), portions, currentLang()),
    ],
  });
};

export const cookComponentScreen = (id: string | undefined): HTMLElement => {
  const component = id === undefined ? undefined : getComponent(id);
  const own = strings.components;
  if (component === undefined) {
    return unknown(hashFor('components'), own.back, strings.screens.components.title, own.unknown);
  }
  const backHash = hashFor('components', component.id);
  return cookScreen({
    id: component.id,
    name: component.name,
    backHash,
    backLabel: own.backToComponent,
    view: (learned) => ({
      name: component.name,
      steps: ownCookView(notebook(), component, currentLang(), techniques(), learned),
      components: [
        { id: component.id, name: component.name, lines: componentLines(notebook(), component) },
      ],
      slots: [],
    }),
    finish: ownFinish(own.noSteps, own.cookDone, backHash, own.backToComponent),
  });
};

export const cookDishScreen = (id: string | undefined): HTMLElement => {
  const dish = id === undefined ? undefined : getDish(id);
  const own = strings.dishes;
  if (dish === undefined) {
    return unknown(hashFor('dishes'), own.back, strings.screens.dishes.title, own.unknown);
  }
  const backHash = hashFor('dishes', dish.id);
  // The portions chosen on the dish screen; before any choice the dish's own.
  const portions = portionsOf(dish.id, dish.portions ?? 1);
  return cookScreen({
    id: dish.id,
    name: dish.name,
    backHash,
    backLabel: own.backToDish,
    // What was swapped on the dish screen is cooked: the stored dish with those fillings.
    view: (learned) =>
      shownOfDish(
        notebook(),
        withSwaps(notebook(), dish, swapsOf(dish.id)).dish,
        portions,
        context(learned),
        stockOptions,
      ),
    finish: ownFinish(own.noSteps, own.cookDone, backHash, own.backToDish),
  });
};
