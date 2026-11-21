// The facts of a dish of the notebook for the character rules: each slot written out into its
// ingredients, with the mass per portion where the slot has an amount, and the techniques of the
// steps of its components and of its assembly. A slot without an amount gives lines without mass.
import { expandComponent, toGrams, unitKind } from '@culina/engine';
import type { CharacterFacts, CharacterLine, Step } from '@culina/engine';
import type { ComponentRecord, DishRecord, Notebook, SlotRecord } from '../records';
import { lineOf } from './classes';
import type { Lookup } from './classes';

/** The component and every component below it, each once. */
const componentsBelow = (nb: Notebook, id: string, seen: Set<string>): ComponentRecord[] => {
  if (seen.has(id)) return [];
  seen.add(id);
  const component = nb.components.find((c) => c.id === id);
  if (component === undefined) return [];
  return [
    component,
    ...component.lines.flatMap((l) =>
      l.ref.kind === 'component' ? componentsBelow(nb, l.ref.id, seen) : [],
    ),
  ];
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
const slotLines = (nb: Notebook, slot: SlotRecord, lookup: Lookup): CharacterLine[] => {
  const g = slotGrams(nb, slot);
  if (slot.ref.kind === 'ingredient') return [lineOf(slot.ref.id, g, lookup)];
  if (g !== undefined) {
    // By the recorded yield where there is one; else one run of the recipe, taken as weighing what
    // went in (no cooking loss is known), which is exact enough for a share.
    const scaled = expandComponent(nb.components, slot.ref.id, nb.facts, { outputG: g });
    const run = scaled.ok ? scaled : expandComponent(nb.components, slot.ref.id, nb.facts);
    if (run.ok && (scaled.ok || run.rawG > 0)) {
      const factor = scaled.ok ? 1 : g / run.rawG;
      return [
        ...run.raw.map((r) => lineOf(r.ingredientId, r.g * factor, lookup)),
        ...run.unmeasured.flatMap((u) =>
          u.ref.kind === 'ingredient' ? [lineOf(u.ref.id, undefined, lookup)] : [],
        ),
      ];
    }
  }
  return componentsBelow(nb, slot.ref.id, new Set()).flatMap((c) =>
    c.lines.flatMap((l) =>
      l.ref.kind === 'ingredient' ? [lineOf(l.ref.id, undefined, lookup)] : [],
    ),
  );
};

/** The facts of one dish of the notebook. */
export const factsOfDish = (nb: Notebook, dish: DishRecord, lookup: Lookup): CharacterFacts => {
  const seen = new Set<string>();
  const steps: Step[] = [
    ...(dish.steps ?? []),
    ...dish.slots.flatMap((s) =>
      s.ref.kind === 'component'
        ? componentsBelow(nb, s.ref.id, seen).flatMap((c) => c.steps ?? [])
        : [],
    ),
  ];
  // The dish record has no course of its own yet; once it has one, the rules read it.
  const course = 'course' in dish && typeof dish.course === 'string' ? dish.course : undefined;
  return {
    lines: dish.slots.flatMap((slot) => slotLines(nb, slot, lookup)),
    techniques: [
      ...new Set(steps.flatMap((s) => (s.technique === undefined ? [] : [s.technique]))),
    ],
    stepsKnown: steps.some((s) => s.technique !== undefined || s.action !== undefined),
    ...(course === undefined ? {} : { course }),
  };
};
