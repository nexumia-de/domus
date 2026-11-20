// The steps of an own component: the words a step can be called by (a technique that is taught, or
// a plain action), the one line a step is shown as, and the steps for cooking, in the shape the
// step-by-step screen of the shipped dishes reads. Pure: no DOM.
import { ACTIONS, pickText, stepWord, techniqueNotes } from '@culina/engine';
import type { Lang, Step, Technique } from '@culina/engine';
import { temperatureText, timeText } from '../classics/amounts';
import type { StepView } from '../classics/cook-view';
import type { LineView } from '../classics/dish-view';
import type { ComponentRecord, DishRecord, Notebook } from '../records';
import { formatMass } from '../shared/mass';
import { slotRows } from '../dishes/slots';
import { lineRows } from './lines';

export interface WordOption {
  /** `t:<id>` for a technique, `a:<id>` for a plain action: the value a step form holds. */
  value: string;
  label: string;
}

/** The words of the kit: the techniques (they teach) and the plain actions, each by name. */
export const wordOptions = (
  lang: Lang,
  techniques: readonly Technique[],
): { skills: WordOption[]; plain: WordOption[] } => {
  const byLabel = (a: WordOption, b: WordOption): number => a.label.localeCompare(b.label, lang);
  return {
    skills: techniques
      .map((t) => ({ value: `t:${t.id}`, label: pickText(t.name, lang) }))
      .sort(byLabel),
    plain: ACTIONS.map((a) => ({ value: `a:${a.id}`, label: pickText(a.name, lang) })).sort(
      byLabel,
    ),
  };
};

/** The name of the word a step is called by; a word the app does not know shows as its id. */
export const wordName = (
  step: Step,
  lang: Lang,
  techniques: readonly Technique[],
): string | undefined => {
  const word = stepWord(step);
  if (word === undefined) return undefined;
  const found =
    word.kind === 'technique'
      ? techniques.find((t) => t.id === word.id)?.name
      : ACTIONS.find((a) => a.id === word.id)?.name;
  return found === undefined ? word.id : pickText(found, lang);
};

/** What the step says: the text it was copied with, else its word; then the user's note. */
const said = (step: Step, lang: Lang, techniques: readonly Technique[]): string =>
  [
    step.text === undefined ? wordName(step, lang, techniques) : pickText(step.text, lang),
    step.note,
  ]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');

const lineViews = (nb: Notebook, component: ComponentRecord, factor = 1): LineView[] => {
  const rows = lineRows(nb, component);
  return component.lines.map((line, index): LineView => {
    const row = rows.ok ? rows.rows[index] : undefined;
    return {
      ...(line.key === undefined ? {} : { key: line.key }),
      ...(line.ref.kind === 'ingredient' ? { ingredient: line.ref.id } : {}),
      name: row?.name ?? line.ref.id,
      ...(row?.g === undefined ? {} : { amount: formatMass(row.g * factor, 'g') }),
      ...(line.note === undefined ? {} : { note: line.note }),
      settled: false,
      optional: false,
    };
  });
};

/**
 * One line per step for a list: the word (or the copied text), the ingredients it uses, time and
 * temperature, the note. "Searing: beef, onion · 10 min · until brown".
 */
export const stepLines = (
  nb: Notebook,
  component: ComponentRecord,
  lang: Lang,
  techniques: readonly Technique[],
): string[] => {
  const lines = lineViews(nb, component);
  return (component.steps ?? []).map((step) => {
    const names = (step.uses ?? [])
      .map((key) => lines.find((l) => l.key === key)?.name)
      .filter((name): name is string => name !== undefined);
    const head =
      step.text === undefined ? wordName(step, lang, techniques) : pickText(step.text, lang);
    const first =
      step.text !== undefined || names.length === 0
        ? head
        : head === undefined
          ? names.join(', ')
          : `${head}: ${names.join(', ')}`;
    return [
      first,
      step.time === undefined ? undefined : timeText(step.time),
      step.temperature === undefined ? undefined : temperatureText(step.temperature),
      step.note,
    ]
      .filter((part): part is string => part !== undefined && part !== '')
      .join(' · ');
  });
};

/** A run of steps with what they may use: a component with its lines, or a dish with its slots. */
interface Part {
  name: string;
  steps: readonly Step[];
  lines: readonly LineView[];
}

/** The steps of the parts in order, numbered through, with each technique's note at its first step. */
const cookSteps = (
  parts: readonly Part[],
  lang: Lang,
  known: readonly Technique[],
  learned: ReadonlySet<string>,
): StepView[] => {
  const byId = new Map(known.map((t) => [t.id, t]));
  const flat = parts.flatMap((part) => part.steps.map((step) => ({ step, part })));
  // A technique the app does not know (an import from a newer version) is left out of the notes.
  const forNotes = flat.map(({ step }): Step => {
    if (step.technique === undefined || byId.has(step.technique)) return step;
    const rest: Step = { ...step };
    delete rest.technique;
    return rest;
  });
  const notes = techniqueNotes(forNotes, known, learned);
  const noteAt = new Set(notes.ok ? notes.notes.map((n) => n.step) : []);
  return flat.map(({ step, part }, i): StepView => {
    const technique = step.technique === undefined ? undefined : byId.get(step.technique);
    return {
      number: i + 1,
      component: part.name,
      text: said(step, lang, known),
      lines: (step.uses ?? [])
        .map((key) => part.lines.find((l) => l.key === key))
        .filter((l): l is LineView => l !== undefined),
      ...(step.time === undefined ? {} : { time: timeText(step.time) }),
      ...(step.temperature === undefined ? {} : { temperature: temperatureText(step.temperature) }),
      ...(technique === undefined ? {} : { technique }),
      note: technique !== undefined && noteAt.has(i),
    };
  });
};

/**
 * The steps of an own component for cooking, one after the other, with the technique note at the
 * first step of a technique the user has not marked as learned.
 *
 * @param nb - The notebook, for names and amounts.
 * @param component - The component; without `steps` the list is empty.
 * @param lang - The content language.
 * @param known - The techniques the app knows; a step with another gets no note.
 * @param learned - Technique ids the user marked as learned.
 * @returns The steps in order.
 */
export function ownCookView(
  nb: Notebook,
  component: ComponentRecord,
  lang: Lang,
  known: readonly Technique[],
  learned: ReadonlySet<string>,
): StepView[] {
  return cookSteps(
    [{ name: component.name, steps: component.steps ?? [], lines: lineViews(nb, component) }],
    lang,
    known,
    learned,
  );
}

/** What the dish view needs to know beyond the notebook. */
export interface DishCookOptions {
  /** True when a made batch of the component is in stock: its steps are then left out. */
  ready?: (componentId: string) => boolean;
  /** The one step shown in place of a component that is ready: "From stock: Tomato sauce". */
  fromStock: (name: string) => string;
}

/**
 * How many runs of a component a slot needs: the grams the slot asks for over the component's
 * output (its recorded yield, else the sum of its lines). 1 when either is unknown.
 */
const runs = (nb: Notebook, component: ComponentRecord, wantedG: number | undefined): number => {
  if (wantedG === undefined) return 1;
  const rows = lineRows(nb, component);
  const inputG = rows.ok ? rows.rows.reduce((sum, row) => sum + (row.g ?? 0), 0) : 0;
  const recorded = component.yield?.amount;
  const yieldG =
    recorded === undefined
      ? undefined
      : recorded.unit === 'kg'
        ? recorded.value * 1000
        : recorded.unit === 'g'
          ? recorded.value
          : undefined;
  const outputG = yieldG ?? inputG;
  return outputG > 0 ? wantedG / outputG : 1;
};

/**
 * The steps of a whole dish for cooking: for each slot filled by a component, in the order of the
 * slots, the steps of that component with its amounts for the portions asked for (or one step
 * saying it comes from stock, when a made batch is there); then the assembly steps of the dish,
 * which use slots. The technique notes run through the whole list, each at its first step.
 *
 * @param nb - The notebook.
 * @param dish - The dish; a slot filled by an ingredient has no steps of its own.
 * @param portions - The portions to cook.
 * @param lang - The content language.
 * @param known - The techniques the app knows.
 * @param learned - Technique ids the user marked as learned.
 * @param options - What is ready in stock, and the wording for it.
 * @returns The steps in order; empty when neither a component nor the dish has steps.
 */
export function dishCookView(
  nb: Notebook,
  dish: DishRecord,
  portions: number,
  lang: Lang,
  known: readonly Technique[],
  learned: ReadonlySet<string>,
  options: DishCookOptions,
): StepView[] {
  const rows = slotRows(nb, dish, portions);
  const parts: Part[] = [];
  const made = new Set<string>();
  dish.slots.forEach((slot) => {
    if (slot.ref.kind !== 'component' || made.has(slot.ref.id)) return;
    const component = nb.components.find((c) => c.id === slot.ref.id);
    if (component === undefined) return;
    made.add(component.id);
    if (options.ready?.(component.id) === true) {
      parts.push({
        name: component.name,
        steps: [{ note: options.fromStock(component.name) }],
        lines: [],
      });
      return;
    }
    if ((component.steps ?? []).length === 0) return;
    // Every slot the component fills counts towards what has to be made.
    const wanted = dish.slots.reduce(
      (sum: number | undefined, other, at) =>
        other.ref.kind === 'component' && other.ref.id === component.id
          ? rows[at]?.totalG === undefined
            ? sum
            : (sum ?? 0) + (rows[at]?.totalG ?? 0)
          : sum,
      undefined,
    );
    parts.push({
      name: component.name,
      steps: component.steps ?? [],
      lines: lineViews(nb, component, runs(nb, component, wanted)),
    });
  });
  const slotLines = dish.slots.map((slot, index): LineView => {
    const row = rows[index];
    return {
      ...(slot.key === undefined ? {} : { key: slot.key }),
      ...(slot.ref.kind === 'ingredient' ? { ingredient: slot.ref.id } : {}),
      name: row?.name ?? slot.ref.id,
      ...(row?.totalG === undefined ? {} : { amount: formatMass(row.totalG, 'g') }),
      settled: false,
      optional: slot.optional === true,
    };
  });
  parts.push({ name: dish.name, steps: dish.steps ?? [], lines: slotLines });
  return cookSteps(parts, lang, known, learned);
}

/** One line per assembly step of a dish, as `stepLines` gives them for a component. */
export const dishStepLines = (
  nb: Notebook,
  dish: DishRecord,
  lang: Lang,
  techniques: readonly Technique[],
): string[] =>
  stepLines(
    nb,
    {
      id: dish.id,
      name: dish.name,
      lines: dish.slots.map((slot) => ({
        ...(slot.key === undefined ? {} : { key: slot.key }),
        ref: slot.ref,
      })),
      steps: dish.steps ?? [],
      version: dish.version,
    },
    lang,
    techniques,
  );
