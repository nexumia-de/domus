// #/classic/<id>/cook: one step on the screen, with the lines it uses, time and temperature, the
// technique note while the skill is not learned, large Back and Next, progress, the whole recipe in
// a tap, and the screen kept awake. At the end the dish can be kept in the notebook.
import { classicOf, handlingRulesList, techniques } from '../../classics/content';
import { handlingNotes, type HandlingNote } from '../../classics/handling-view';
import { catalogueTree } from '../../classics/tree';
import { cookView, type StepView } from '../../classics/cook-view';
import { dishView } from '../../classics/dish-view';
import { currentLang } from '../../classics/lang';
import { ingredientLabel, loadNames } from '../../classics/names';
import { portionsOf, setStep, stepOf } from '../../classics/session';
import { learnedSkills, setLearned } from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { keepAwake } from '../../shell/wake-lock';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { finishPanel } from './finish';
import { handlingNote } from './handling-note';
import { ingredientsBlock, lineList, methodBlock } from './recipe';
import { insteadFor } from './substitute-block';
import { techniqueNote } from './technique-note';

const t = strings.classics;

export const cookClassicScreen = (id: string | undefined): HTMLElement => {
  const classic = id === undefined ? undefined : classicOf(id);
  const section = el('section', 'screen cook-steps');
  if (classic === undefined) {
    const back = el('a', 'family-link', t.backToStart);
    back.href = hashFor('start');
    section.append(
      back,
      el('h1', undefined, t.classicsTitle),
      el('p', 'note-quiet', t.unknownDish),
    );
    return section;
  }
  const lang = currentLang();
  const portions = portionsOf(classic.id);
  const nameOf = (ingredient: string): string => ingredientLabel(ingredient, lang);
  const instead = insteadFor(lang, nameOf);
  const back = el('a', 'family-link', t.backToRecipe);
  back.href = hashFor('classic', classic.id);
  const title = dishView(classic, portions, lang, nameOf);
  section.append(back, el('h1', undefined, title.ok ? title.view.name : classic.id));

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
    setStep(classic.id, Math.max(0, Math.min(total, step)));
    draw(true);
  };

  let message: string | undefined;
  let rules = new Map<number, HandlingNote[]>();
  const draw = (moveFocus: boolean): void => {
    const view = cookView(classic, portions, lang, nameOf, techniques(), learnedSkills());
    const steps: StepView[] = view.ok ? view.steps : [];
    const learned = learnedSkills();
    rules = handlingNotes(steps, handlingRulesList(), catalogueTree(), learned);
    const total = steps.length;
    const at = Math.min(stepOf(classic.id), total);
    progress.max = Math.max(total, 1);
    progress.value = at;
    const shownDish = dishView(classic, portions, lang, nameOf);
    recipe.replaceChildren(
      ...(shownDish.ok
        ? [ingredientsBlock(shownDish.view.components, shownDish.view.slots, instead)]
        : []),
      ...(methodBlock(steps) === undefined ? [] : [methodBlock(steps) as HTMLElement]),
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
    if (at >= total) {
      const done = finishPanel(classic, portions, lang);
      body.replaceChildren(
        ...(total === 0 ? [el('p', 'note-quiet', t.noSteps)] : []),
        status,
        done,
      );
    } else {
      const step = steps[at] as StepView;
      const heading = el('h2', 'cook-step-heading', t.stepHeading(step.number, total));
      body.replaceChildren(heading, status, stepBody(step));
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
    box.append(el('p', 'muted', t.stepFrom(step.component)), el('p', 'cook-step-text', step.text));
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
      const name = techniques().find((x) => x.id === note.rule.technique)?.name[lang];
      box.append(
        handlingNote(note, lang, () => learn(note.rule.technique, name ?? note.rule.technique)),
      );
    }
    return box;
  };

  draw(false);
  keepAwake(section);
  // The catalogue gives the ingredient names; draw again when it is there.
  void loadNames().then(() => draw(false));
  return section;
};
