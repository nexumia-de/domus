// The facts of a dish of the notebook for the character rules: each slot written out into its
// ingredients, with the mass per portion where the slot has an amount, the techniques of the
// steps of its components and of its assembly, and its course. A slot without an amount gives
// lines without mass. A component that cannot be written out (gone, or without lines) gives one
// line without any class, so nothing is said of it as if it were known.
import { expandComponent, toGrams, unitKind } from '@culina/engine';
import type { CharacterFacts, CharacterLine, Step } from '@culina/engine';
import type { ComponentRecord, DishRecord, Notebook, SlotRecord } from '../records';
import { catalogueBelow } from './below';
import { lineOf } from './classes';
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

const slotGrams = (nb: Notebook, slot: SlotRecord): number | undefined => {
  if (slot.amount === undefined) return undefined;
  if (slot.ref.kind === 'component' && unitKind(slot.amount.unit) !== 'mass') return undefined;
  const grams = toGrams(
    slot.amount,
    slot.ref.kind === 'ingredient' ? nb.facts[slot.ref.id] : undefined,
  );
  return grams.ok ? grams.g : undefined;
};

/** The ingredient lines of one slot. */
const slotLines = (
  nb: Notebook,
  slot: SlotRecord,
  lookup: Lookup,
  below: Below,
): CharacterLine[] => {
  const g = slotGrams(nb, slot);
  if (slot.ref.kind === 'ingredient') return [lineOf(slot.ref.id, g, lookup, below)];
  if (g !== undefined) {
    // By the recorded yield where there is one; else one run of the recipe, taken as weighing what
    // went in (no cooking loss is known), which is exact enough for a share.
    const scaled = expandComponent(nb.components, slot.ref.id, nb.facts, { outputG: g });
    const run = scaled.ok ? scaled : expandComponent(nb.components, slot.ref.id, nb.facts);
    if (run.ok && (scaled.ok || run.rawG > 0)) {
      const factor = scaled.ok ? 1 : g / run.rawG;
      return [
        ...run.raw.map((r) => lineOf(r.ingredientId, r.g * factor, lookup, below)),
        // A line without amount is listed as it is: an ingredient, or a whole component whose
        // ingredients then count without mass.
        ...run.unmeasured.flatMap((u) =>
          u.ref.kind === 'ingredient'
            ? [lineOf(u.ref.id, undefined, lookup, below)]
            : linesWithoutMass(nb, u.ref.id, lookup, below),
        ),
      ];
    }
  }
  return linesWithoutMass(nb, slot.ref.id, lookup, below);
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
  const steps: Step[] = [
    ...(dish.steps ?? []),
    ...dish.slots.flatMap((s) =>
      s.ref.kind === 'component'
        ? componentsBelow(nb, s.ref.id, seen).flatMap((c) => c.steps ?? [])
        : [],
    ),
  ];
  return {
    lines: dish.slots.flatMap((slot) => slotLines(nb, slot, lookup, below)),
    techniques: [
      ...new Set(steps.flatMap((s) => (s.technique === undefined ? [] : [s.technique]))),
    ],
    stepsKnown: steps.some((s) => s.technique !== undefined || s.action !== undefined),
    ...(dish.course === undefined ? {} : { course: dish.course }),
  };
};
