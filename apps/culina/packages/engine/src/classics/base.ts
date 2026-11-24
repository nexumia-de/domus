// A base: a shipped file to build one's own dishes on (docs/decisions/bases-and-pack.md). Its
// components are in the dish when a slot reaches them, directly or through the lines of another
// component; a component that no slot reaches and that has the role of a slot filled by a component
// is an alternative for that slot. No list of alternatives is stored: the rule is the notebook's
// own (`alternativesFor` in the app), applied to the file. Pure.
import type { Classic, ClassicComponent, ClassicSlot } from './types';

/** True when the file is a base; a file without `kind` is a dish. */
export const isBase = (classic: Classic): boolean => classic.kind === 'base';

/**
 * True when the file is a dish of its own: something cooked and served as it is. A base that is
 * a sauce (alioli, mayonnaise) is a part of dishes; it is listed with the components, not with
 * the dishes (docs/decisions/sauces-are-parts.md).
 */
export const isDishOfItsOwn = (classic: Classic): boolean =>
  !(isBase(classic) && classic.course === 'sauce');

const subComponents = (c: ClassicComponent | undefined): string[] =>
  (c?.lines ?? []).flatMap((l) => (l.ref?.kind === 'component' ? [l.ref.id] : []));

/**
 * The ids of the components reached from `start`, through the lines of components, each once; the
 * start ids are in it when the file has them.
 */
export const componentsReached = (classic: Classic, start: readonly string[]): Set<string> => {
  const byId = new Map((classic.components ?? []).map((c) => [c.id, c]));
  const seen = new Set<string>();
  const todo = [...start];
  while (todo.length > 0) {
    const id = todo.pop() as string;
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    todo.push(...subComponents(byId.get(id)));
  }
  return seen;
};

/** The ids of the components the dish uses: those a slot reaches, directly or through other components. */
export const componentsInDish = (classic: Classic): Set<string> =>
  componentsReached(
    classic,
    classic.slots.flatMap((s) => (s.ref?.kind === 'component' ? [s.ref.id] : [])),
  );

/**
 * The alternatives of a slot of a base: the components no slot reaches whose role is the slot's,
 * in file order. A slot filled by an ingredient, and every slot of a dish, has none.
 */
export const slotAlternatives = (classic: Classic, slot: ClassicSlot): ClassicComponent[] => {
  if (!isBase(classic) || slot.ref?.kind !== 'component') return [];
  const inDish = componentsInDish(classic);
  return (classic.components ?? []).filter(
    (c) => c.role !== undefined && c.role === slot.role && !inDish.has(c.id),
  );
};

/**
 * The ids of every component a file uses: those in the dish and, in a base, the alternatives with
 * the components their lines name. A component outside this set is unused.
 */
export const componentsUsed = (classic: Classic): Set<string> => {
  const inDish = componentsInDish(classic);
  if (!isBase(classic)) return inDish;
  const alternatives = classic.slots.flatMap((s) => slotAlternatives(classic, s).map((c) => c.id));
  return new Set([...inDish, ...componentsReached(classic, alternatives)]);
};

/**
 * The base with another component in a slot: `componentId` must be an alternative of the slot at
 * `slotIndex` (`slotAlternatives`); the component that filled the slot becomes an alternative in
 * its turn, by the same rule. In a frame, where every component says whether its recipe is
 * vegetarian, the flag follows the components now in the dish. Anything else returns the base
 * unchanged.
 */
export const chooseAlternative = (
  classic: Classic,
  slotIndex: number,
  componentId: string,
): Classic => {
  const slot = classic.slots[slotIndex];
  if (slot === undefined || !slotAlternatives(classic, slot).some((c) => c.id === componentId))
    return classic;
  const slots = classic.slots.map((s, i) =>
    i === slotIndex ? { ...s, ref: { kind: 'component' as const, id: componentId } } : s,
  );
  const chosen: Classic = { ...classic, slots };
  const inDish = componentsInDish(chosen);
  const parts = (chosen.components ?? []).filter((c) => inDish.has(c.id));
  const known = parts.every((c) => c.from?.vegetarian !== undefined);
  return classic.frame === true && known
    ? { ...chosen, vegetarian: parts.every((c) => c.from?.vegetarian === true) }
    : chosen;
};

/**
 * The base as it is cooked: without its alternatives. What a screen shows of a shipped dish (the
 * ingredients, the steps, the nutrition, the characters) is this; Keep takes the whole base, so
 * that Swap offers the alternatives in the notebook. A dish, and a base without alternatives, is
 * returned as it is.
 */
export const withoutAlternatives = (classic: Classic): Classic => {
  if (!isBase(classic)) return classic;
  const inDish = componentsInDish(classic);
  const components = classic.components ?? [];
  return components.every((c) => inDish.has(c.id))
    ? classic
    : { ...classic, components: components.filter((c) => inDish.has(c.id)) };
};
