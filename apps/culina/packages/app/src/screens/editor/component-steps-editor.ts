// The steps of a component in the editor, as a kit: per step what is done (a skill that is taught,
// or a simple action), the lines that go in (ticked), time, temperature and one line of note. A
// step copied from a shipped dish keeps its text, shown above the fields. Nothing here stores: the
// form is changed and `changed` is called.
import { pickText } from '@culina/engine';
import { techniques } from '../../classics/content';
import { currentLang } from '../../classics/lang';
import { wordOptions } from '../../components/steps-view';
import {
  freshLineKey,
  newStepForm,
  type ComponentForm,
  type LineForm,
  type StepForm,
} from '../../editor/component-form';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { nextId } from '../fields';
import { bareSelect, button, fieldError, textField, type FieldError } from './form-bits';

const t = strings.editor;

const TIME_UNITS = ['s', 'min', 'h'] as const;
const TEMPERATURE_UNITS = ['C', 'F'] as const;

export interface StepsEditor {
  element: HTMLElement;
  /** Rebuilds the steps (after Discard, or when the steps were changed elsewhere). */
  redraw(): void;
  /** Brings the lists of lines up to date when the lines above changed; keeps the focus. */
  syncLines(): void;
  /** Shows what cannot be saved at the step it concerns (by index). */
  showProblems(problems: ReadonlyMap<number, readonly string[]>): void;
}

/**
 * The steps section of the component editor.
 *
 * @param form - The form; its `steps` and the keys of its lines are changed in place.
 * @param changed - Called after every change, to keep the draft.
 * @param lineLabel - The name of a line, or `undefined` while its ingredient is not picked.
 */
export const stepsEditor = (
  form: ComponentForm,
  changed: () => void,
  lineLabel: (line: LineForm) => string | undefined,
): StepsEditor => {
  const element = el('div', 'steps-editor');
  const list = el('div', 'step-cards');
  const add = el('div', 'actions');
  let errors: FieldError[] = [];
  let lists: { step: StepForm; node: HTMLElement }[] = [];
  let signature = '';

  const steps = (): StepForm[] => {
    form.steps ??= [];
    return form.steps;
  };
  const labels = (): (string | undefined)[] => form.lines.map(lineLabel);
  const sign = (): string => JSON.stringify(labels());

  const fillUses = (step: StepForm, node: HTMLElement): void => {
    const named = labels();
    const boxes = form.lines.flatMap((line, index) => {
      const name = named[index];
      if (name === undefined) return [];
      const label = el('label', 'choice');
      const input = el('input');
      input.type = 'checkbox';
      input.checked = line.key !== undefined && step.uses.includes(line.key);
      input.addEventListener('change', () => {
        // A line gets its key when a step first uses it.
        line.key ??= freshLineKey(form.lines);
        const key = line.key;
        step.uses = input.checked
          ? [...step.uses.filter((k) => k !== key), key]
          : step.uses.filter((k) => k !== key);
        changed();
      });
      label.append(input, el('span', undefined, name));
      return [label];
    });
    node.replaceChildren(
      el('legend', undefined, t.stepUses),
      ...(boxes.length === 0 ? [el('p', 'hint', t.stepNoLines)] : boxes),
    );
  };

  const wordSelect = (step: StepForm): HTMLElement => {
    const lang = currentLang();
    const options = wordOptions(lang, techniques());
    const control = el('select', 'field');
    control.id = nextId('field');
    control.append(new Option(t.wordNone, ''));
    const group = (label: string, items: readonly { value: string; label: string }[]): void => {
      if (items.length === 0) return;
      const node = el('optgroup');
      node.label = label;
      for (const item of items) node.append(new Option(item.label, item.value));
      control.append(node);
    };
    group(t.wordSkills, options.skills);
    group(t.wordPlain, options.plain);
    // A word this version does not know (an import from a newer one) stays chosen under its id.
    const known = [...options.skills, ...options.plain].some((o) => o.value === step.word);
    if (step.word !== '' && !known) control.append(new Option(step.word.slice(2), step.word));
    control.value = step.word;
    control.addEventListener('change', () => {
      step.word = control.value;
      changed();
    });
    const wrap = el('div', 'field-wrap');
    const label = el('label', 'field-label', t.wordLabel);
    label.htmlFor = control.id;
    wrap.append(label, control);
    return wrap;
  };

  const numberRow = (
    label: string,
    unitLabel: string,
    units: readonly string[],
    value: string,
    unit: string,
    onValue: (typed: string) => void,
    onUnit: (chosen: string) => void,
  ): HTMLElement => {
    const field = textField(label, value, true);
    field.control.addEventListener('input', () => {
      onValue(field.control.value);
      changed();
    });
    const select = bareSelect(
      unitLabel,
      units.map((u) => ({ value: u, label: u === 'C' || u === 'F' ? `°${u}` : u })),
      unit,
    );
    select.addEventListener('change', () => {
      onUnit(select.value);
      changed();
    });
    const row = el('div', 'line-amount');
    row.append(field.wrap, select);
    return row;
  };

  /** The select of the step at `index`, where the focus goes after a move or a removal. */
  const wordOf = (index: number): HTMLElement | null =>
    list.querySelectorAll<HTMLElement>('.step-card').item(index)?.querySelector('select') ?? null;

  const move = (from: number, to: number): void => {
    const all = steps();
    const [step] = all.splice(from, 1);
    if (step === undefined) return;
    all.splice(to, 0, step);
    changed();
    draw();
    wordOf(to)?.focus();
  };

  const card = (step: StepForm, index: number, total: number): HTMLElement => {
    const n = index + 1;
    const box = el('fieldset', 'step-card');
    box.append(el('legend', undefined, t.stepLegend(n)));
    if (step.text !== undefined) {
      box.append(
        el('p', 'muted', t.stepText),
        el('p', 'step-source-text', pickText(step.text, currentLang())),
      );
    }
    const uses = el('fieldset', 'choices step-uses');
    fillUses(step, uses);
    lists.push({ step, node: uses });
    const note = textField(t.stepNote, step.note);
    note.control.addEventListener('input', () => {
      step.note = note.control.value;
      changed();
    });
    const tools = el('div', 'actions step-tools');
    const up = button('↑', 'quiet', () => move(index, index - 1), t.stepUp(n));
    const down = button('↓', 'quiet', () => move(index, index + 1), t.stepDown(n));
    up.disabled = index === 0;
    down.disabled = index === total - 1;
    tools.append(
      up,
      down,
      button(
        t.remove,
        'quiet',
        () => {
          steps().splice(index, 1);
          changed();
          draw();
          (
            wordOf(Math.min(index, steps().length - 1)) ?? add.querySelector<HTMLElement>('button')
          )?.focus();
        },
        t.stepRemove(n),
      ),
    );
    const error = fieldError(box);
    errors.push(error);
    box.append(
      wordSelect(step),
      uses,
      numberRow(
        t.stepTime,
        t.stepTimeUnit,
        TIME_UNITS,
        step.time,
        step.timeUnit,
        (typed) => {
          step.time = typed;
          delete step.timeTo;
        },
        (chosen) => {
          step.timeUnit = chosen as StepForm['timeUnit'];
        },
      ),
      numberRow(
        t.stepTemperature,
        t.stepTemperatureUnit,
        TEMPERATURE_UNITS,
        step.temperature,
        step.temperatureUnit,
        (typed) => {
          step.temperature = typed;
          delete step.temperatureTo;
        },
        (chosen) => {
          step.temperatureUnit = chosen as StepForm['temperatureUnit'];
        },
      ),
      note.wrap,
      error.node,
      tools,
    );
    return box;
  };

  const draw = (): void => {
    errors = [];
    lists = [];
    const all = steps();
    list.replaceChildren(...all.map((step, index) => card(step, index, all.length)));
    signature = sign();
  };

  add.append(
    button(t.addStep, 'quiet', () => {
      steps().push(newStepForm());
      changed();
      draw();
      list.querySelector<HTMLElement>('.step-card:last-child select')?.focus();
    }),
  );
  element.append(el('p', 'muted', t.stepsHelp), list, add);
  draw();

  return {
    element,
    redraw: draw,
    syncLines: () => {
      const now = sign();
      if (now === signature) return;
      signature = now;
      for (const { step, node } of lists) fillUses(step, node);
    },
    showProblems: (problems) => {
      errors.forEach((error, index) => {
        const texts = problems.get(index);
        if (texts === undefined || texts.length === 0) error.clear();
        else error.show(texts.join(' '));
      });
    },
  };
};
