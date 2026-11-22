// A base: a shipped file to build one's own dishes on (docs/decisions/bases-and-pack.md). Its
// components are in the dish when a slot reaches them, directly or through the lines of another
// component; a component that no slot reaches and that has the role of a slot filled by a component
// is an alternative for that slot. No list of alternatives is stored: the rule is the notebook's
// own (`alternativesFor` in the app), applied to the file. Pure.
import type { Classic, ClassicComponent, ClassicSlot } from './types';

/** True when the file is a base; a file without `kind` is a dish. */
export const isBase = (classic: Classic): boolean => classic.kind === 'base';

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
