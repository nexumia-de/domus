// #/components/<id>/cook: an own component cooked step by step, as the shipped dishes are: one step
// on the screen with the lines it uses, time and temperature, the note of its skill while the skill
// is not learned, the handling rules of its ingredients, large Back and Next, and the screen kept
// awake.
import { handlingRulesList, techniques } from '../classics/content';
import type { StepView } from '../classics/cook-view';
import { handlingNotes, type HandlingNote } from '../classics/handling-view';
import { currentLang } from '../classics/lang';
import { loadNames } from '../classics/names';
import { setStep, stepOf } from '../classics/session';
import { catalogueTree } from '../classics/tree';
import { ownCookView } from '../components/steps-view';
import { getComponent, learnedSkills, notebook, setLearned } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { keepAwake } from '../shell/wake-lock';
import { strings } from '../strings';
import { handlingNote } from './classics/handling-note';
import { lineList, methodBlock } from './classics/recipe';
import { techniqueNote } from './classics/technique-note';
import { storeText } from './editor/store-text';

const t = strings.classics;
const own = strings.components;

export const cookComponentScreen = (id: string | undefined): HTMLElement => {
  const component = id === undefined ? undefined : getComponent(id);
  const section = el('section', 'screen cook-steps');
  const back = el('a', 'family-link', component === undefined ? own.back : own.backToComponent);
  back.href = component === undefined ? hashFor('components') : hashFor('components', component.id);
  if (component === undefined) {
    section.append(
      back,
      el('h1', undefined, strings.screens.components.title),
      el('p', 'note-quiet', own.unknown),
    );
    return section;
  }
  const lang = currentLang();
  section.append(back, el('h1', undefined, component.name));

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
    setStep(component.id, Math.max(0, Math.min(total, step)));
    draw(true);
  };

  let message: string | undefined;
  let rules = new Map<number, HandlingNote[]>();
  const draw = (moveFocus: boolean): void => {
    const learned = learnedSkills();
    const steps = ownCookView(notebook(), component, lang, techniques(), learned);
    rules = handlingNotes(steps, handlingRulesList(), catalogueTree(), learned);
    const total = steps.length;
    const at = Math.min(stepOf(component.id), total);
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
      const done = el('a', 'btn primary', own.backToComponent);
      done.href = hashFor('components', component.id);
      body.replaceChildren(
        el('h2', 'cook-step-heading', total === 0 ? own.noSteps : own.cookDone),
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
