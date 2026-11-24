// Composes the frames of data/frames/<id>.json into bases (docs/classic-format.md, A frame).
// A frame is the project's own composition (docs/decisions/building-kit.md): it names, per
// slot, the shipped recipes that can fill it, and brings no recipe of its own. Composing copies
// each recipe's one component into the frame, scaled to the frame's persons, with where it comes
// from; the first recipe of a slot fills it, the others are its alternatives by the rule of a
// base (the same role, reached by no slot). The result is a dish file like any other, so Keep,
// Swap, the finder and the views need nothing new. Pure: no file access, no clock.

/** Scales an amount by a factor, to three significant digits (0.333 tsp, 12.5 g, 1250 ml). */
const scaleAmount = (amount, factor) => {
  if (amount === undefined || factor === 1) return amount;
  const round = (n) => Number((n * factor).toPrecision(3));
  return {
    ...amount,
    value: round(amount.value),
    ...(amount.max === undefined ? {} : { max: round(amount.max) }),
  };
};

/**
 * The one component of a recipe that a frame can take, or the reason it cannot: the recipe must
 * be the project's own (no source units, nothing settled), with one slot filled by its one
 * component, whose lines name ingredients only.
 */
const partOf = (recipe) => {
  if (recipe.source?.own !== true)
    return { problem: 'follows a source; a frame takes own recipes' };
  const components = recipe.components ?? [];
  const slot = recipe.slots.length === 1 ? recipe.slots[0] : undefined;
  if (
    components.length !== 1 ||
    slot?.ref?.kind !== 'component' ||
    slot.ref.id !== components[0].id
  )
    return { problem: 'is not one component in one slot' };
  if (components[0].lines.some((line) => line.ref?.kind === 'component'))
    return { problem: 'has a line that names a component' };
  return { component: components[0] };
};

/**
 * One frame as a base.
 *
 * @param frame - A frame file: id, name, originalName, country, course, persons, slots, note.
 * @param recipes - The shipped recipes by id.
 * @returns `{ ok: true, classic }`, or `{ ok: false, problems }` naming each slot and recipe.
 */
export const composeFrame = (frame, recipes) => {
  const problems = [];
  const components = [];
  const slots = [];
  const taken = new Set();
  let vegetarian = true;
  frame.slots.forEach((slot, i) => {
    if (slot.ingredient !== undefined) {
      // A slot filled by a plain ingredient (the cheese of a pizza): no recipe behind it.
      slots.push({
        role: slot.role,
        ref: { kind: 'ingredient', id: slot.ingredient },
        ...(slot.amount === undefined ? {} : { amount: slot.amount }),
        ...(slot.optional === true ? { optional: true } : {}),
      });
      return;
    }
    if (!Array.isArray(slot.parts) || slot.parts.length === 0) {
      problems.push(`slots[${i}]: names neither parts nor an ingredient`);
      return;
    }
    slot.parts.forEach((id, j) => {
      const recipe = recipes.get(id);
      if (recipe === undefined) return void problems.push(`slots[${i}]: no shipped recipe ${id}`);
      if (taken.has(id)) return void problems.push(`slots[${i}]: ${id} is named twice`);
      const part = partOf(recipe);
      if (part.component === undefined)
        return void problems.push(`slots[${i}]: ${id} ${part.problem}`);
      taken.add(id);
      const factor = frame.persons / recipe.persons.value;
      components.push({
        ...part.component,
        // The recipe's name, not the component's: in the frame it stands for the whole recipe.
        name: recipe.name,
        role: slot.role,
        lines: part.component.lines.map((line) =>
          line.amount === undefined ? line : { ...line, amount: scaleAmount(line.amount, factor) },
        ),
        from: {
          recipe: recipe.id,
          name: recipe.name,
          source: recipe.source,
          vegetarian: recipe.vegetarian === true,
        },
      });
      if (j === 0) {
        if (recipe.vegetarian !== true) vegetarian = false;
        slots.push({
          role: slot.role,
          ref: { kind: 'component', id: part.component.id },
          ...(slot.optional === true ? { optional: true } : {}),
        });
      }
    });
  });
  const ids = components.map((c) => c.id);
  for (const id of new Set(ids.filter((x, k) => ids.indexOf(x) !== k)))
    problems.push(`component id ${id} comes from two recipes`);
  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    classic: {
      id: frame.id,
      kind: 'base',
      frame: true,
      name: frame.name,
      originalName: frame.originalName,
      country: frame.country,
      vegetarian: frame.vegetarian ?? vegetarian,
      course: frame.course,
      source: { own: true, year: frame.year },
      persons: { value: frame.persons, basis: 'stated' },
      components,
      slots,
      settled: [],
      check: {
        method: 'second-reader',
        note: 'A frame: put together by the project from shipped recipes, each read a second time in its own file. The combination itself was read by nobody and cooked by nobody.',
      },
      ...(frame.note === undefined ? {} : { note: frame.note }),
    },
  };
};

/**
 * Every frame as a base, in the order given.
 *
 * @param frames - The frame files.
 * @param classics - The shipped recipes (dish files).
 * @returns The composed bases; throws with every problem when a frame cannot be composed.
 */
export const composeFrames = (frames, classics) => {
  const recipes = new Map(classics.map((c) => [c.id, c]));
  const out = [];
  const problems = [];
  for (const frame of frames) {
    if (recipes.has(frame.id)) problems.push(`${frame.id}: a shipped recipe has this id`);
    const composed = composeFrame(frame, recipes);
    if (composed.ok) out.push(composed.classic);
    else problems.push(...composed.problems.map((p) => `${frame.id}: ${p}`));
  }
  if (problems.length > 0) throw new Error(`frames: ${problems.join('; ')}`);
  return out;
};
