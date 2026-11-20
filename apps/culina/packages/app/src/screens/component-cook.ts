// #/components/<id>/cook and #/dishes/<id>/cook: an own component, or a whole dish, cooked step by
// step as the shipped dishes are: one step on the screen with what it uses, time and temperature,
// the note of its skill while the skill is not learned, the handling rules of its ingredients,
// large Back and Next, and the screen kept awake. A dish runs through its components in the order
// of its slots and then through its assembly; a component that is ready in stock is one step.
import { handlingRulesList, techniques } from '../classics/content';
import type { StepView } from '../classics/cook-view';
import { handlingNotes, type HandlingNote } from '../classics/handling-view';
import { currentLang } from '../classics/lang';
import { loadNames } from '../classics/names';
import { setStep, stepOf } from '../classics/session';
import { catalogueTree } from '../classics/tree';
import { dishCookView, ownCookView } from '../components/steps-view';
import { getComponent, getDish, learnedSkills, notebook, setLearned, stockOf } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { keepAwake } from '../shell/wake-lock';
import { strings } from '../strings';
import { handlingNote } from './classics/handling-note';
import { lineList, methodBlock } from './classics/recipe';
import { techniqueNote } from './classics/technique-note';
import { storeText } from './editor/store-text';

const t = strings.classics;

/** What the screen cooks: a name, where Back leads, and the steps for what is learned so far. */
interface Cookable {
  id: string;
  name: string;
  backHash: string;
  backLabel: string;
  noSteps: string;
  done: string;
  steps: (learned: ReadonlySet<string>) => StepView[];
}

const unknown = (backHash: string, backLabel: string, title: string, text: string): HTMLElement => {
  const section = el('section', 'screen cook-steps');
  const back = el('a', 'family-link', backLabel);
  back.href = backHash;
  section.append(back, el('h1', undefined, title), el('p', 'note-quiet', text));
  return section;
};

const cookScreen = (cooked: Cookable): HTMLElement => {
  const section = el('section', 'screen cook-steps');
  const back = el('a', 'family-link', cooked.backLabel);
  back.href = cooked.backHash;
  const lang = currentLang();
  section.append(back, el('h1', undefined, cooked.name));

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
  const draw = (moveFocus: boolean): void => {
    const learned = learnedSkills();
    const steps = cooked.steps(learned);
    rules = handlingNotes(steps, handlingRulesList(), catalogueTree(), learned);
    const total = steps.length;
    const at = Math.min(stepOf(cooked.id), total);
    progress.max = Math.max(total, 1);
    progress.value = at;
    const method = methodBlock(steps);
    recipe.replaceChildren(...(method === undefined ? [] : [method]));
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
    if (at >= total) {
      const done = el('a', 'btn primary', cooked.backLabel);
      done.href = cooked.backHash;
      body.replaceChildren(
        el('h2', 'cook-step-heading', total === 0 ? cooked.noSteps : cooked.done),
        status,
        done,
      );
    } else {
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

  const learn = (technique: string, name: string): void => {
    void setLearned(technique, true).then((done) => {
      message = done.ok ? t.learnedDone(name) : storeText(done.error.code);
      draw(true);
    });
  };

  const stepBody = (step: StepView): HTMLElement => {
    const box = el('div', 'cook-step');
    // A dish names the part a step belongs to; a component is its own only part.
    if (step.component !== cooked.name) box.append(el('p', 'muted', t.stepFrom(step.component)));
    if (step.text !== '') box.append(el('p', 'cook-step-text', step.text));
    if (step.lines.length > 0) {
      box.append(el('h3', undefined, t.usesHeading), lineList(step.lines, t.usesHeading));
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
      const name = techniques().find((x) => x.id === note.rule.technique)?.name[lang];
      box.append(
        handlingNote(note, lang, () => learn(note.rule.technique, name ?? note.rule.technique)),
      );
    }
    return box;
  };

  draw(false);
  keepAwake(section);
  // The catalogue gives the tree for the handling rules; draw again when it is there.
  void loadNames().then(() => draw(false));
  return section;
};

export const cookComponentScreen = (id: string | undefined): HTMLElement => {
  const component = id === undefined ? undefined : getComponent(id);
  const own = strings.components;
  if (component === undefined) {
    return unknown(hashFor('components'), own.back, strings.screens.components.title, own.unknown);
  }
  return cookScreen({
    id: component.id,
    name: component.name,
    backHash: hashFor('components', component.id),
    backLabel: own.backToComponent,
    noSteps: own.noSteps,
    done: own.cookDone,
    steps: (learned) => ownCookView(notebook(), component, currentLang(), techniques(), learned),
  });
};

export const cookDishScreen = (id: string | undefined): HTMLElement => {
  const dish = id === undefined ? undefined : getDish(id);
  const own = strings.dishes;
  if (dish === undefined) {
    return unknown(hashFor('dishes'), own.back, strings.screens.dishes.title, own.unknown);
  }
  return cookScreen({
    id: dish.id,
    name: dish.name,
    backHash: hashFor('dishes', dish.id),
    backLabel: own.backToDish,
    noSteps: own.noSteps,
    done: own.cookDone,
    steps: (learned) =>
      dishCookView(notebook(), dish, dish.portions ?? 1, currentLang(), techniques(), learned, {
        // A made batch in stock: the component is ready, its steps are left out.
        ready: (componentId) => stockOf({ kind: 'component', id: componentId }).length > 0,
        fromStock: own.fromStock,
      }),
  });
};
