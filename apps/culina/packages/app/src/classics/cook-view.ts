// The steps of a classic for cooking, one after the other: each with the lines it uses and their
// amounts (from the engine), its time and temperature as the source gives them, and the technique
// note the engine says to show. Pure: no DOM.
import { deriveClassic, pickText, techniqueNotes } from '@culina/engine';
import type { Classic, Lang, Technique, TextStep } from '@culina/engine';
import { temperatureText, timeText } from './amounts';
import { dishView } from './dish-view';
import type { LineView, NameOf } from './dish-view';

export interface StepView {
  /** 1-based, for "Step 3 of 8". */
  number: number;
  component: string;
  text: string;
  lines: LineView[];
  time?: string;
  temperature?: string;
  /** The technique of this step, when it has one. */
  technique?: Technique;
  /** True when the note of that technique shows at this step: first use, not yet learned. */
  note: boolean;
  /**
   * The step as one line of the method list, where it is not the text with time and temperature:
   * an own step without a copied text names the lines it uses ("Searing: Beef · 10 min").
   */
  listed?: string;
}

export type CookViewResult = { ok: true; steps: StepView[] } | { ok: false; code: string };

/**
 * The steps of every component in order, with the notes the user has not outgrown.
 *
 * @param classic - A shipped classic.
 * @param portions - Portions for the amounts.
 * @param lang - The content language.
 * @param nameOf - The name of a catalogue ingredient.
 * @param known - The techniques the engine knows.
 * @param learned - Technique ids the user marked as learned.
 * @returns The steps; a technique the engine does not know gives no note, not an error.
 */
export function cookView(
  classic: Classic,
  portions: number,
  lang: Lang,
  nameOf: NameOf,
  known: readonly Technique[],
  learned: ReadonlySet<string>,
): CookViewResult {
  const derived = deriveClassic(classic, { portions, lang });
  if (!derived.ok) return { ok: false, code: derived.error.code };
  const shown = dishView(classic, portions, lang, nameOf);
  if (!shown.ok) return shown;
  const flat: { step: TextStep; component: number }[] = derived.components.flatMap((c, component) =>
    c.steps.map((step) => ({ step, component })),
  );
  const notes = techniqueNotes(
    flat.map((f) => f.step),
    known,
    learned,
  );
  const noteAt = new Set(notes.ok ? notes.notes.map((n) => n.step) : []);
  const byId = new Map(known.map((x) => [x.id, x]));
  const steps = flat.map(({ step, component }, i): StepView => {
    const view = shown.view.components[component];
    const technique = step.technique === undefined ? undefined : byId.get(step.technique);
    return {
      number: i + 1,
      component: view?.name ?? '',
      text: pickText(step.text, lang),
      lines: (step.uses ?? [])
        .map((key) => view?.lines.find((l) => l.key === key))
        .filter((l): l is LineView => l !== undefined),
      ...(step.time === undefined ? {} : { time: timeText(step.time) }),
      ...(step.temperature === undefined ? {} : { temperature: temperatureText(step.temperature) }),
      ...(technique === undefined ? {} : { technique }),
      note: technique !== undefined && noteAt.has(i),
    };
  });
  return { ok: true, steps };
}
