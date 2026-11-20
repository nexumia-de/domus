// The steps of an own component: the words a step can be called by (a technique that is taught, or
// a plain action), the one line a step is shown as, and the steps for cooking, in the shape the
// step-by-step screen of the shipped dishes reads. Pure: no DOM.
import { ACTIONS, pickText, stepWord, techniqueNotes } from '@culina/engine';
import type { Lang, Step, Technique } from '@culina/engine';
import { temperatureText, timeText } from '../classics/amounts';
import type { StepView } from '../classics/cook-view';
import type { LineView } from '../classics/dish-view';
import type { ComponentRecord, Notebook } from '../records';
import { formatMass } from '../shared/mass';
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

const lineViews = (nb: Notebook, component: ComponentRecord): LineView[] => {
  const rows = lineRows(nb, component);
  return component.lines.map((line, index): LineView => {
    const row = rows.ok ? rows.rows[index] : undefined;
    return {
      ...(line.key === undefined ? {} : { key: line.key }),
      ...(line.ref.kind === 'ingredient' ? { ingredient: line.ref.id } : {}),
      name: row?.name ?? line.ref.id,
      ...(row?.g === undefined ? {} : { amount: formatMass(row.g, 'g') }),
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
  const steps = component.steps ?? [];
  const lines = lineViews(nb, component);
  const byId = new Map(known.map((t) => [t.id, t]));
  // A technique the app does not know (an import from a newer version) is left out of the notes.
  const forNotes = steps.map((step): Step => {
    if (step.technique === undefined || byId.has(step.technique)) return step;
    const rest: Step = { ...step };
    delete rest.technique;
    return rest;
  });
  const notes = techniqueNotes(forNotes, known, learned);
  const noteAt = new Set(notes.ok ? notes.notes.map((n) => n.step) : []);
  return steps.map((step, i): StepView => {
    const technique = step.technique === undefined ? undefined : byId.get(step.technique);
    return {
      number: i + 1,
      component: component.name,
      text: said(step, lang, known),
      lines: (step.uses ?? [])
        .map((key) => lines.find((l) => l.key === key))
        .filter((l): l is LineView => l !== undefined),
      ...(step.time === undefined ? {} : { time: timeText(step.time) }),
      ...(step.temperature === undefined ? {} : { temperature: temperatureText(step.temperature) }),
      ...(technique === undefined ? {} : { technique }),
      note: technique !== undefined && noteAt.has(i),
    };
  });
}
