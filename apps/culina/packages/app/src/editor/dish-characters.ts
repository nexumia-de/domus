// The cook's correction of a dish's characters in the editor: the dish as the draft stands (to
// compute its characters before it can be saved), the shown set, and what a tick changes. The
// form keeps the correction as the record does, as what is added and what is taken away, so a
// change of the slots still changes the computed rest. Pure: no DOM, no store.
import { correctCharacters } from '@culina/engine';
import { catalogueBelow } from '../characters/below';
import type { Below, Lookup } from '../characters/classes';
import { factsOfDish } from '../characters/dish';
import { CHARACTER_ORDER, normalCorrection } from '../characters/correction';
import type { StoredCorrection } from '../characters/correction';
import { characterIds } from '../characters/view';
import type { ComponentRef } from '@culina/engine';
import type { DishRecord, Notebook, SlotRecord } from '../records';
import { parseEntry } from '../shared/parse';
import { asCourse, wholePortions, type DishForm } from './dish-form';

/**
 * The dish as the draft stands, for the character rules only: the slots that have a filling, an
 * amount where one is typed and readable, the portions and the course, and the assembly steps that are stored
 * (a draft's steps are not read: the techniques of the components' steps still count).
 */
export const draftDish = (form: DishForm): DishRecord => ({
  id: form.id,
  name: form.name,
  // A component slot without an amount is one run at the dish's portions (`runsWithoutAmount`).
  ...(wholePortions(form.portions) === undefined ? {} : { portions: wholePortions(form.portions) }),
  ...(asCourse(form.course) === undefined ? {} : { course: asCourse(form.course) }),
  slots: form.slots.flatMap((slot): SlotRecord[] => {
    if (slot.ref === undefined) return [];
    const entry = parseEntry(slot.amount);
    return [
      {
        role: slot.role,
        ref: slot.ref as ComponentRef,
        ...(entry.kind === 'ok' ? { amount: { value: entry.value, unit: slot.unit } } : {}),
      },
    ];
  }),
  version: form.version ?? { family: form.id, date: '' },
});

/** The characters the rules give the draft, in the order of the table. */
export const computedOfDraft = (
  nb: Notebook,
  form: DishForm,
  lookup: Lookup,
  below: Below = catalogueBelow,
): string[] => characterIds(factsOfDish(nb, draftDish(form), lookup, below));

export interface CharacterTick {
  id: string;
  /** Whether the dish shows the character. */
  shown: boolean;
  /** Whether the rules give it; where this differs from `shown`, the cook corrected it. */
  computed: boolean;
}

/** One tick per character of the table: what the rules say and what the dish shows. */
export const characterTicks = (
  computed: readonly string[],
  correction: StoredCorrection | undefined,
): CharacterTick[] => {
  const shown = new Set(correctCharacters(computed, correction, CHARACTER_ORDER));
  return CHARACTER_ORDER.map((id) => ({
    id,
    shown: shown.has(id),
    computed: computed.includes(id),
  }));
};

/**
 * The correction after the cook set one character to shown or not shown. Setting a character to
 * what the rules say takes it out of the correction; every other entry stays as it was, whether
 * or not it differs from the rules at the moment.
 */
export const setCharacter = (
  correction: StoredCorrection | undefined,
  computed: readonly string[],
  id: string,
  shown: boolean,
): StoredCorrection | undefined => {
  const without = (list: readonly string[] | undefined): string[] =>
    (list ?? []).filter((other) => other !== id);
  const add = without(correction?.add);
  const remove = without(correction?.remove);
  if (shown !== computed.includes(id)) (shown ? add : remove).push(id);
  return normalCorrection({ add, remove });
};

export interface CharacterSummary {
  /** The characters the dish shows, in the order of the table. */
  shown: string[];
  /** How many ticks differ from what the rules say: the rows marked "added" or "taken away". */
  corrected: number;
}

/** What the closed "What it is like" names: the characters ticked and how many the cook changed. */
export const characterSummary = (ticks: readonly CharacterTick[]): CharacterSummary => ({
  shown: ticks.filter((tick) => tick.shown).map((tick) => tick.id),
  corrected: ticks.filter((tick) => tick.shown !== tick.computed).length,
});
