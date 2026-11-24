// The facts of a dish of the notebook for the character rules: each slot written out into its
// ingredients with their mass, as the dish's total list writes them out (`expandSlot`): a slot with
// an amount by its weight, a component slot without one as one run of the component at the dish's
// stored portions (the rule of a shipped dish, so that a kept copy is judged as the dish it was
// kept from); the techniques of the steps of its components and of its assembly, and its course.
// An ingredient slot without an amount gives a line without mass. A component that cannot be
// written out (gone, or without lines) gives one line without any class, so nothing is said of it
// as if it were known.
import type { CharacterFacts, CharacterLine, Step } from '@culina/engine';
import { expandSlot } from '../dishes/raw';
import { slotMass } from '../dishes/slots';
import type { SlotMass } from '../dishes/slots';
import type { ComponentRecord, DishRecord, Notebook } from '../records';
import { catalogueBelow } from './below';
import { conversionOf, lineOf } from './classes';
import { isNotCounted } from './table';
import type { Below, Lookup } from './classes';

/** A line of which nothing is known: no class, no mass. */
const UNKNOWN: CharacterLine = { classes: [] };

const componentOf = (nb: Notebook, id: string): ComponentRecord | undefined =>
  nb.components.find((c) => c.id === id);

/** The component and every component below it, each once; a missing one is left out. */
const componentsBelow = (nb: Notebook, id: string, seen: Set<string>): ComponentRecord[] => {
  if (seen.has(id)) return [];
  seen.add(id);
  const component = componentOf(nb, id);
  if (component === undefined) return [];
  return [
    component,
    ...component.lines.flatMap((l) =>
      l.ref.kind === 'component' ? componentsBelow(nb, l.ref.id, seen) : [],
    ),
  ];
};

/**
 * Every ingredient of a component and of the components below it, without mass; a component that
 * is gone or has no lines gives one unknown line. A component met again (a loop) adds nothing.
 */
const linesWithoutMass = (
  nb: Notebook,
  id: string,
  lookup: Lookup,
  below: Below,
  seen: Set<string> = new Set(),
): CharacterLine[] => {
  if (seen.has(id)) return [];
  seen.add(id);
  const component = componentOf(nb, id);
  if (component === undefined || component.lines.length === 0) return [UNKNOWN];
  return component.lines.flatMap((l) =>
    l.ref.kind === 'ingredient'
      ? [lineOf(l.ref.id, undefined, lookup, below)]
      : linesWithoutMass(nb, l.ref.id, lookup, below, seen),
  );
};

/**
 * The ingredient lines of one slot, by the dish's total list (`expandSlot`, the same expansion as
 * the nutrition): a slot with an amount by its weight, a component slot without one as one run of
 * the component at the dish's stored portions, as a shipped dish counts its components.
 */
const slotLines = (nb: Notebook, row: SlotMass, lookup: Lookup, below: Below): CharacterLine[] => {
  if (row.kind === 'ingredient') return [lineOf(row.id, row.totalG, lookup, below)];
  const run = expandSlot(nb, row, 'characters');
  if (run?.ok !== true) return linesWithoutMass(nb, row.id, lookup, below);
  // A component without lines, here or below, is not known: it says nothing as if it were.
  const empty = componentsBelow(nb, row.id, new Set()).filter((c) => c.lines.length === 0);
  return [
    ...empty.map(() => UNKNOWN),
    ...run.raw.map((r) => lineOf(r.ingredientId, r.g, lookup, below)),
    // A line without an amount, or one whose weight is not known, is listed as it is: an
    // ingredient, or a whole component whose ingredients then count without mass.
    ...[...run.unmeasured, ...run.unconverted].flatMap((u) =>
      u.ref.kind === 'ingredient'
        ? [lineOf(u.ref.id, undefined, lookup, below)]
        : linesWithoutMass(nb, u.ref.id, lookup, below),
    ),
  ];
};

/**
 * The facts of one dish of the notebook.
 *
 * @param below - The foods below a group; by default those of the loaded catalogue.
 */
export const factsOfDish = (
  nb: Notebook,
  dish: DishRecord,
  lookup: Lookup,
  below: Below = catalogueBelow,
): CharacterFacts => {
  const seen = new Set<string>();
  const parts = dish.slots.flatMap((s) =>
    s.ref.kind === 'component' ? componentsBelow(nb, s.ref.id, seen) : [],
  );
  const steps: Step[] = [...(dish.steps ?? []), ...parts.flatMap((c) => c.steps ?? [])];
  // An amount in a spoon or a piece is weighed as for a shipped dish (`conversionOf`: the
  // ingredient's own figure, else the one above it, else the one a group's foods agree on, such as
  // the egg's 44 g), so that the same line weighs the same in a copy as in its shipped dish.
  const ids = new Set([
    ...dish.slots.flatMap((s) => (s.ref.kind === 'ingredient' ? [s.ref.id] : [])),
    ...parts.flatMap((c) =>
      c.lines.flatMap((l) => (l.ref.kind === 'ingredient' ? [l.ref.id] : [])),
    ),
  ]);
  const weighed: Notebook = {
    ...nb,
    facts: Object.fromEntries([...ids].map((id) => [id, conversionOf(id, lookup, below)])),
  };
  return {
    // Kitchen water is no part of what a dish is like (the table's `notCounted`).
    // The slots for the dish's stored portions (only shares are read); without stored portions a
    // component slot without an amount is not weighed (`runsWithoutAmount`) and counts by presence.
    lines: dish.slots
      .map((slot) => slotMass(weighed, dish, slot, dish.portions ?? 1))
      .flatMap((row) => slotLines(weighed, row, lookup, below))
      .filter((l) => l.classes[0] === undefined || !isNotCounted(l.classes[0])),
    techniques: [
      ...new Set(steps.flatMap((s) => (s.technique === undefined ? [] : [s.technique]))),
    ],
    // A step names a technique or a plain action; heat written as an action ("heat", "cook") is
    // only here, and the rule "uncooked" reads it.
    actions: [...new Set(steps.flatMap((s) => (s.action === undefined ? [] : [s.action])))],
    stepsKnown: steps.some((s) => s.technique !== undefined || s.action !== undefined),
    ...(dish.course === undefined ? {} : { course: dish.course }),
  };
};
