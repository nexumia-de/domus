// The steps of an own component: the words a step can be called by (a technique that is taught, or
// a plain action), the one line a step is shown as, and the steps for cooking, in the shape the
// step-by-step screen of the shipped dishes reads. Pure: no DOM.
import {
  ACTIONS,
  componentLineGrams,
  pickText,
  runWeight,
  stepWord,
  techniqueNotes,
} from '@culina/engine';
import type { Lang, Step, Technique } from '@culina/engine';
import { temperatureText, timeText } from '../classics/amounts';
import type { StepView } from '../classics/cook-view';
import type { LineView } from '../classics/dish-view';
import type { ComponentRecord, DishRecord, Notebook } from '../records';
import { formatMass } from '../shared/mass';
import { scaledWritten } from '../shared/units';
import { strings } from '../strings';
import { RUN_RULE } from '../dishes/raw';
import { slotRows } from '../dishes/slots';
import type { SlotRow } from '../dishes/slots';
import { lineRows } from './lines';
import { cannotScale, refName } from './names';

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

/**
 * The lines of a component with their amounts times `factor`. The name never depends on the
 * amounts: it comes from the notebook even where the engine cannot add the component up. A line
 * that cannot be weighed shows its own amount as written (pieces to the half).
 */
const lineViews = (nb: Notebook, component: ComponentRecord, factor = 1): LineView[] => {
  const rows = lineRows(nb, component);
  return component.lines.map((line, index): LineView => {
    const row = rows.ok ? rows.rows[index] : undefined;
    const amount =
      row?.g !== undefined
        ? formatMass(row.g * factor, 'g')
        : row?.unconverted !== undefined
          ? scaledWritten(row.unconverted.written, factor)
          : undefined;
    // A line that cannot be weighed says so quietly beside its own note.
    const note = [
      line.note,
      row?.unconverted === undefined ? undefined : strings.notebook.lacks[row.unconverted.lacks],
    ]
      .filter((part): part is string => part !== undefined && part !== '')
      .join(' · ');
    return {
      ...(line.key === undefined ? {} : { key: line.key }),
      ...(line.ref.kind === 'ingredient' ? { ingredient: line.ref.id } : {}),
      name: refName(nb, line.ref),
      ...(amount === undefined ? {} : { amount }),
      ...(note === '' ? {} : { note }),
      settled: false,
      optional: false,
    };
  });
};

/**
 * One step as one line of a list: the word (or the copied text), the names of what it uses, time
 * and temperature, the note. "Searing: beef, onion · 10 min · until brown".
 */
const stepLine = (
  step: Step,
  lines: readonly LineView[],
  lang: Lang,
  techniques: readonly Technique[],
): string => {
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
};

/** One line per step of a component for a list, as `stepLine` writes it. */
export const stepLines = (
  nb: Notebook,
  component: ComponentRecord,
  lang: Lang,
  techniques: readonly Technique[],
): string[] => {
  const lines = lineViews(nb, component);
  return (component.steps ?? []).map((step) => stepLine(step, lines, lang, techniques));
};

/** A run of steps with what they may use: a component with its lines, or a dish with its slots. */
export interface Part {
  name: string;
  /** The component of the part; absent for the dish's own assembly. */
  componentId?: string;
  steps: readonly Step[];
  lines: readonly LineView[];
  /** True when a made batch is in stock: its steps are one "From stock" step. */
  ready?: boolean;
  /** Why its amounts are one run as written and not scaled to the dish, where they cannot be. */
  note?: string;
}

/**
 * "Béchamel cannot be scaled: Milk has no weight here. Weigh its output, or give Milk a weight.
 * For one run as written." (`cannotScale`): why a part's amounts are one run as written.
 */
export const asWrittenNote = (nb: Notebook, unknown: string): string =>
  `${cannotScale(nb, unknown)} ${strings.notebook.rawAsWritten}`;

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
      // The amounts of a part shown as one run as written carry the reason at every step.
      ...(part.note === undefined ? {} : { amountsNote: part.note }),
      listed: stepLine(step, part.lines, lang, known),
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

/** How many runs of a component are needed, or the component whose weight is not known. */
type Need = number | { unknown: string };

/**
 * One run's weight of a component, as the dish's total list scales it (`RUN_RULE`, `runWeight`):
 * for a slot, its yield or what goes in; for a line that names it by mass, the same, unless the
 * run holds kitchen water. A line that cannot be weighed, at any depth, leaves it unknown.
 */
const weightOf = (nb: Notebook, id: string, by: 'slot' | 'line'): Need => {
  const { notWeighedByLine, ...forSlot } = RUN_RULE;
  const options = by === 'line' ? { ...forSlot, notWeighedByLine } : forSlot;
  const run = runWeight(nb.components, id, nb.facts, options);
  if (run.ok) return run.g;
  return { unknown: 'componentId' in run.error ? (run.error.componentId ?? id) : id };
};

/**
 * How many runs of a component the dish's slots need, all of them together: for a slot with an
 * amount, the grams it asks for over one run's weight (`weightOf`); for a slot without one, its
 * runs (`runsWithoutAmount`: one run at the dish's stored portions). The same rule as the dish's
 * total list (`dishRaw`, `expandSlot`). Unknown when a run's weight is needed and not known; one
 * run when no slot says anything.
 */
const slotRuns = (nb: Notebook, id: string, rows: readonly SlotRow[]): Need => {
  let times: number | undefined;
  for (const row of rows.filter((r) => r.kind === 'component' && r.id === id)) {
    if (row.totalG !== undefined) {
      const weight = weightOf(nb, id, 'slot');
      if (typeof weight !== 'number') return weight;
      times = (times ?? 0) + row.totalG / weight;
    } else if (row.runs !== undefined) times = (times ?? 0) + row.runs;
  }
  return times ?? 1;
};

/**
 * The runs of every component a dish makes: those of its slots, and below them each component a
 * line names, by the line's grams over one run of it, or one run per run of the line's component
 * where the line has no amount (`withoutAmount: 'run'`, as a shipped dish counts it). The runs of
 * one component from every place it is needed add up, in whatever order the slots come. Where a
 * run's weight is not known the component is shown as written, one run, with the reason
 * (`asWritten`: the component whose weight is not known), and so is what is below it. A
 * component ready in stock is not made, nor what is below it. A loop is not followed.
 */
const runsOfParts = (
  nb: Notebook,
  dish: DishRecord,
  rows: readonly SlotRow[],
  ready: ((componentId: string) => boolean) | undefined,
): { order: string[]; runs: Map<string, number>; asWritten: Map<string, string> } => {
  const byId = new Map(nb.components.map((c, i) => [c.id, { component: c, at: i }]));
  const runs = new Map<string, number>();
  const asWritten = new Map<string, string>();
  const order: string[] = [];
  const add = (id: string, need: Need, stack: readonly string[], tree: string[]): void => {
    const found = byId.get(id);
    if (found === undefined || stack.includes(id)) return;
    if (!tree.includes(id)) tree.push(id);
    if (typeof need !== 'number') asWritten.set(id, asWritten.get(id) ?? need.unknown);
    const times = typeof need === 'number' ? need : 1;
    const unknown = asWritten.get(id);
    runs.set(id, unknown !== undefined ? 1 : (runs.get(id) ?? 0) + times);
    if (ready?.(id) === true) return;
    const measured = componentLineGrams(found.component, nb.facts);
    found.component.lines.forEach((line, index) => {
      if (line.ref.kind !== 'component') return;
      const below = [...stack, id];
      if (unknown !== undefined) {
        add(line.ref.id, { unknown }, below, tree);
        return;
      }
      if (line.amount === undefined) {
        add(line.ref.id, times, below, tree);
        return;
      }
      const grams = measured.ok ? measured.lines.find((l) => l.index === index)?.g : undefined;
      const weight = weightOf(nb, line.ref.id, 'line');
      const sub: Need =
        typeof weight !== 'number'
          ? weight
          : grams === undefined
            ? { unknown: line.ref.id }
            : (times * grams) / weight;
      add(line.ref.id, sub, below, tree);
    });
  };
  const seen = new Set<string>();
  for (const slot of dish.slots) {
    if (slot.ref.kind !== 'component' || seen.has(slot.ref.id)) continue;
    seen.add(slot.ref.id);
    const tree: string[] = [];
    add(slot.ref.id, slotRuns(nb, slot.ref.id, rows), [], tree);
    // The components of one filling in the order the notebook keeps them, which is by name.
    tree.sort((x, y) => (byId.get(x)?.at ?? 0) - (byId.get(y)?.at ?? 0));
    for (const id of tree) if (!order.includes(id)) order.push(id);
  }
  return { order, runs, asWritten };
};

/**
 * The parts of a whole dish: each component it makes (those of its slots in the order of the
 * slots, each with the components its lines name, `runsOfParts`), once per component, with its
 * steps and its lines with the amounts for the portions asked for; a component that is ready in
 * stock has one step saying so, and what is below it is not made. Last the dish's own assembly,
 * whose lines are the slots with their totals.
 *
 * @param nb - The notebook.
 * @param dish - The dish; a slot filled by an ingredient has no part of its own.
 * @param portions - The portions to cook.
 * @param options - What is ready in stock, and the wording for it.
 * @returns The parts; the last one is the dish itself.
 */
export function dishParts(
  nb: Notebook,
  dish: DishRecord,
  portions: number,
  options: DishCookOptions,
): Part[] {
  const rows = slotRows(nb, dish, portions);
  const { order, runs, asWritten } = runsOfParts(nb, dish, rows, options.ready);
  const parts: Part[] = order.flatMap((id): Part[] => {
    const component = nb.components.find((c) => c.id === id);
    if (component === undefined) return [];
    const lines = lineViews(nb, component, runs.get(id) ?? 1);
    // Where the runs cannot be worked out: the component as written, and why, in the words the
    // total list uses for what it cannot add up.
    const unknown = asWritten.get(id);
    const note = unknown === undefined ? {} : { note: asWrittenNote(nb, unknown) };
    if (options.ready?.(id) === true) {
      return [
        {
          name: component.name,
          componentId: id,
          steps: [{ note: options.fromStock(component.name) }],
          lines,
          ready: true,
          ...note,
        },
      ];
    }
    return [
      { name: component.name, componentId: id, steps: component.steps ?? [], lines, ...note },
    ];
  });
  const slotLines = dish.slots.map((slot, index): LineView => {
    const row = rows[index];
    return {
      ...(slot.key === undefined ? {} : { key: slot.key }),
      ...(slot.ref.kind === 'ingredient' ? { ingredient: slot.ref.id } : {}),
      name: row?.name ?? refName(nb, slot.ref),
      ...(row?.totalG === undefined ? {} : { amount: formatMass(row.totalG, 'g') }),
      settled: false,
      optional: slot.optional === true,
    };
  });
  parts.push({ name: dish.name, steps: dish.steps ?? [], lines: slotLines });
  return parts;
}

/**
 * The steps of a whole dish for cooking: the steps of its parts (`dishParts`) in order. The
 * technique notes run through the whole list, each at its first step.
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
  return partSteps(dishParts(nb, dish, portions, options), lang, known, learned);
}

/** The steps of parts, numbered through, with each technique's note at its first step. */
export const partSteps = (
  parts: readonly Part[],
  lang: Lang,
  known: readonly Technique[],
  learned: ReadonlySet<string>,
): StepView[] =>
  cookSteps(
    // A part that is ready names no line in its one step.
    parts.map((p) => (p.ready === true ? { ...p, lines: [] } : p)),
    lang,
    known,
    learned,
  );

/** The lines of an own component as the dish and cook screens show them, at its written amounts. */
export const componentLines = (nb: Notebook, component: ComponentRecord): LineView[] =>
  lineViews(nb, component);

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
